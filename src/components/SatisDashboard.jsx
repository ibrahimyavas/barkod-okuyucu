import { useCallback, useMemo, useState } from "react";
import {
  ShoppingBag, Camera, CameraOff, Trash2, Printer, Wallet, CreditCard, ChevronDown, FileBarChart2,
} from "lucide-react";
import { useSatisCart } from "../hooks/useSatisCart.js";
import { useFaturalar } from "../hooks/useFaturalar.js";
import { useFaturaAyarlari } from "../hooks/useFaturaAyarlari.js";
import { useCariAccounts } from "../hooks/useCariAccounts.js";
import { useCameraScanner } from "../hooks/useCameraScanner.js";
import { resolveSalePrice, sellableProducts, findBarcodeByName } from "../lib/satis.js";
import { todayISO, trDate, fmtCurrency } from "../lib/format.js";
import CameraPanel from "./CameraPanel.jsx";
import FaturaDocument from "./FaturaDocument.jsx";
import GunSonuRaporu from "./GunSonuRaporu.jsx";

const ODEME_YONTEMLERI = [
  { value: "nakit", label: "Nakit", icon: Wallet },
  { value: "kart", label: "Kart", icon: CreditCard },
];

// Satır bazında vergiyi ayrıştırır - worker/fatura.js'teki createFatura ile
// birebir aynı matematik, ödeme öncesi ekranda ara toplam/KDV önizlemesi
// için (belgeyi asıl hesaplayan sunucu tarafı, burası sadece önizleme).
function splitLine(adet, birimFiyat, vergiOrani) {
  const vergiliToplam = Math.round(adet * birimFiyat * 100) / 100;
  const vergisiz = Math.round((vergiliToplam / (1 + (vergiOrani || 0) / 100)) * 100) / 100;
  const kdv = Math.round((vergiliToplam - vergisiz) * 100) / 100;
  return { vergiliToplam, vergisiz, kdv };
}

// Basit, barkod okuyucuyla çalışan bir satış (POS) ekranı - Satış
// Fiyatları'nda tanımlanan "son satış fiyatı" (vergi dahil) buraya
// yansıyor. Gün Sonu/Z Raporu bilerek göze çarpmayan, kapalı bir bölümde
// (bkz. .collapsible) - günlük kullanımda kasiyerin sürekli görmesi
// gerekmiyor. Gerçek bir yazar kasaya doğrudan bağlı DEĞİL (bkz. aşağıdaki
// not) - bu, kasiyerin fiziksel cihaza ayrıca girmesi gereken bir "fiş"
// üretir.
export default function SatisDashboard({ fiyatlar, products, customers = [] }) {
  const cart = useSatisCart();
  const { faturalar, addFatura } = useFaturalar();
  const { settings } = useFaturaAyarlari();
  const { accounts } = useCariAccounts();

  const [manualCode, setManualCode] = useState("");
  const [manualName, setManualName] = useState("");
  const [nameError, setNameError] = useState(null);
  const [scannerOn, setScannerOn] = useState(false);
  const [lastHit, setLastHit] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [odemeYontemi, setOdemeYontemi] = useState("nakit");
  // Opsiyonel - Müşteriler'de tanımlı bir müşteriyi fişe bağlamak için.
  // Boş bırakılırsa (çoğu perakende satışta olduğu gibi) worker/fatura.js
  // "Perakende Satış" yazıyor.
  const [customerId, setCustomerId] = useState("");
  // Opsiyonel - Cari Hesap'a borç olarak işlemek için (veresiye satış).
  // customerId'den ayrı: biri fişte görünen isim, diğeri bakiye takibi.
  const [cariId, setCariId] = useState("");
  const [postToCari, setPostToCari] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [gunSonuOpen, setGunSonuOpen] = useState(false);

  const sellable = useMemo(() => sellableProducts(fiyatlar, products), [fiyatlar, products]);

  const handleAddCode = useCallback(
    (code) => {
      const resolved = resolveSalePrice(code, { fiyatlar, products });
      if (!resolved) {
        setScanError(`"${code}" için satış fiyatı tanımlanmamış - önce Satış Fiyatları'ndan tanımlayın.`);
        return;
      }
      setScanError(null);
      cart.addLine({
        barkod: code,
        urunAdi: resolved.urunAdi || code,
        birim: resolved.birim,
        birimFiyat: resolved.sonFiyat,
        vergiOrani: resolved.vergiOrani,
      });
      setLastHit({ code, ts: Date.now() });
    },
    [fiyatlar, products, cart]
  );

  const camera = useCameraScanner({ enabled: scannerOn, onDetect: handleAddCode });

  function handleManualSubmit(e) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    handleAddCode(code);
    setManualCode("");
  }

  // Barkodu bilmeyen/eldeki olmayan kasiyer için - ürün adını yazıp
  // (datalist'ten seçerek) aynı sepete ekleme akışına giriyor.
  function handleNameSubmit(e) {
    e.preventDefault();
    const name = manualName.trim();
    if (!name) return;
    const barkod = findBarcodeByName(name, { fiyatlar, products });
    if (!barkod) {
      setNameError(`"${name}" adıyla satılabilir bir ürün bulunamadı - listeden tam adını seçin.`);
      return;
    }
    setNameError(null);
    handleAddCode(barkod);
    setManualName("");
  }

  const totals = useMemo(() => {
    let araToplam = 0;
    let kdvTutari = 0;
    let genelToplam = 0;
    for (const it of cart.items) {
      const { vergisiz, kdv, vergiliToplam } = splitLine(it.adet, it.birimFiyat, it.vergiOrani);
      araToplam += vergisiz;
      kdvTutari += kdv;
      genelToplam += vergiliToplam;
    }
    return {
      araToplam: Math.round(araToplam * 100) / 100,
      kdvTutari: Math.round(kdvTutari * 100) / 100,
      genelToplam: Math.round(genelToplam * 100) / 100,
    };
  }, [cart.items]);

  async function completeSale() {
    if (cart.items.length === 0) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      const kalemler = cart.items.map((it) => ({
        urunAdi: it.urunAdi,
        miktar: it.adet,
        birim: it.birim,
        birimFiyat: it.birimFiyat,
        vergiOrani: it.vergiOrani,
      }));
      const musteri = customers.find((c) => c.id === customerId);
      const tarih = todayISO();
      const result = await addFatura({
        tur: "fis",
        tarih,
        odemeYontemi,
        muhatapAdi: musteri?.ad || "",
        kalemler,
        cariId: cariId || null,
        postToCari,
      });
      setActiveReport(null);
      setActiveDoc({ tur: "fis", tarih, odemeYontemi, muhatapAdi: musteri?.ad || "", kalemler, ...result });
      cart.clearCart();
      setCustomerId("");
      setCariId("");
      setPostToCari(false);
      requestAnimationFrame(() => window.print());
    } catch (err) {
      setCompleteError(err.message);
    } finally {
      setCompleting(false);
    }
  }

  const today = todayISO();
  const bugunFisler = useMemo(
    () => faturalar.filter((f) => f.tur === "fis" && f.tarih === today),
    [faturalar, today]
  );
  const gunOzeti = useMemo(() => {
    const toplam = bugunFisler.reduce((s, f) => s + (f.genelToplam || 0), 0);
    const araToplam = bugunFisler.reduce((s, f) => s + (f.araToplam || 0), 0);
    const kdv = bugunFisler.reduce((s, f) => s + (f.kdvTutari || 0), 0);
    const nakit = bugunFisler.filter((f) => f.odemeYontemi === "nakit").reduce((s, f) => s + (f.genelToplam || 0), 0);
    const kart = bugunFisler.filter((f) => f.odemeYontemi === "kart").reduce((s, f) => s + (f.genelToplam || 0), 0);
    return { fisSayisi: bugunFisler.length, araToplam, kdv, toplam, nakit, kart };
  }, [bugunFisler]);

  function printReport(tur) {
    if (tur === "z" && !window.confirm("Z Raporu günün satış kapanışını temsil eder ve yazdırılacak. Devam edilsin mi?")) {
      return;
    }
    setActiveDoc(null);
    setActiveReport({ ozet: gunOzeti, tarih: today, tur });
    requestAnimationFrame(() => window.print());
  }

  return (
    <div className="dashboard">
      <div className="stat-cards">
        <div className="stat-card">
          <ShoppingBag size={18} />
          <div>
            <div className="stat-value">{cart.items.length}</div>
            <div className="stat-label">Sepette Ürün</div>
          </div>
        </div>
        <div className="stat-card">
          <Wallet size={18} />
          <div>
            <div className="stat-value">{fmtCurrency(totals.genelToplam)}</div>
            <div className="stat-label">Ödenecek Tutar</div>
          </div>
        </div>
      </div>

      <p className="dashboard-hint">
        Gerçek bir yazar kasaya bağlı değildir - "Ödemeyi Tamamla" bir fiş oluşturup yazdırır, kasiyer bunu fiziksel
        yazar kasaya ayrıca işlemelidir.
      </p>

      <div className="qr-scan-toggle-row">
        <button
          type="button"
          className={`icon-btn labeled ${scannerOn ? "active" : ""}`}
          onClick={() => setScannerOn((v) => !v)}
        >
          {scannerOn ? <CameraOff size={16} /> : <Camera size={16} />}
          {scannerOn ? "Kamerayı Kapat" : "Barkod Okuyucuyla Ekle"}
        </button>
      </div>

      {scannerOn && (
        <CameraPanel camera={camera} cameraOn={scannerOn} onToggleCamera={() => setScannerOn(false)} lastHit={lastHit} />
      )}

      <form className="manual-entry" onSubmit={handleManualSubmit}>
        <input
          type="text"
          placeholder="Barkodu elle girin…"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
        />
        <button type="submit" className="icon-btn" aria-label="Sepete ekle">
          <ShoppingBag size={16} />
        </button>
      </form>

      {scanError && <p className="form-error">{scanError}</p>}

      {/* Barkodu elde/akılda olmayan kasiyer için - ürün adıyla ekleme. */}
      <form className="manual-entry" onSubmit={handleNameSubmit}>
        <input
          type="text"
          placeholder="Ya da ürün adıyla ekleyin…"
          list="st-urun-adlari"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
        />
        <datalist id="st-urun-adlari">
          {sellable.map((p) => (
            <option key={p.barkod} value={p.urunAdi} />
          ))}
        </datalist>
        <button type="submit" className="icon-btn" aria-label="Sepete ekle">
          <ShoppingBag size={16} />
        </button>
      </form>

      {nameError && <p className="form-error">{nameError}</p>}

      <div className="scan-table-wrap">
        {cart.items.length === 0 ? (
          <p className="empty-state">Sepet boş. Barkod okutun ya da elle girin.</p>
        ) : (
          <div className="scan-table-scroll">
            <table className="scan-table">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th>Birim Fiyat</th>
                  <th>Adet</th>
                  <th>Tutar</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cart.items.map((it) => (
                  <tr key={it.barkod}>
                    <td>
                      {it.urunAdi}
                      <div className="muted code-cell">{it.barkod}</div>
                    </td>
                    <td className="muted">{fmtCurrency(it.birimFiyat)}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="qty-input"
                        value={it.adet}
                        onChange={(e) => cart.updateQty(it.barkod, Number(e.target.value) || 1)}
                      />
                    </td>
                    <td>
                      <strong>{fmtCurrency(it.adet * it.birimFiyat)}</strong>
                    </td>
                    <td>
                      <button className="icon-btn danger" onClick={() => cart.removeLine(it.barkod)} aria-label="Sil" title="Sil">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {cart.items.length > 0 && (
        <div className="satis-checkout">
          <p className="totals-preview muted">
            Ara Toplam: {fmtCurrency(totals.araToplam)} · KDV: {fmtCurrency(totals.kdvTutari)} · Genel Toplam:{" "}
            <strong>{fmtCurrency(totals.genelToplam)}</strong>
          </p>

          <div className="field">
            <label htmlFor="st-musteri">Müşteri (opsiyonel)</label>
            <select id="st-musteri" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Perakende (isimsiz) —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.ad}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="st-cari">Cari Hesap'tan seç (opsiyonel)</label>
            <select id="st-cari" value={cariId} onChange={(e) => setCariId(e.target.value)}>
              <option value="">— Seçilmedi —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.ad}
                </option>
              ))}
            </select>
          </div>

          {cariId && (
            <label className="checkbox-inline field-wide">
              <input type="checkbox" checked={postToCari} onChange={(e) => setPostToCari(e.target.checked)} />
              Tutarı bu cari hesaba borç olarak işle (veresiye satış - hemen tahsil edilmedi)
            </label>
          )}

          <div className="scan-mode-toggle">
            {ODEME_YONTEMLERI.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`scan-mode-btn ${odemeYontemi === o.value ? "active" : ""}`}
                onClick={() => setOdemeYontemi(o.value)}
              >
                <o.icon size={14} /> {o.label}
              </button>
            ))}
          </div>

          {completeError && <p className="form-error">{completeError}</p>}

          <button type="button" className="submit-btn" onClick={completeSale} disabled={completing}>
            <Printer size={16} />
            {completing ? "Kaydediliyor…" : "Ödemeyi Tamamla ve Fiş Kes"}
          </button>
        </div>
      )}

      {/* Gün Sonu/Z Raporu bilerek gizli bir bölümde - günlük kullanımda
          kasiyerin gözüne çarpmaması için. */}
      <div className="collapsible">
        <button type="button" className="collapsible-header" onClick={() => setGunSonuOpen((v) => !v)}>
          <span>
            <FileBarChart2 size={14} /> Gün Sonu / Z Raporu
          </span>
          <ChevronDown size={16} className={gunSonuOpen ? "chevron-open" : ""} />
        </button>

        {gunSonuOpen && (
          <div className="collapsible-body">
            <p className="dashboard-hint">
              Bugün ({trDate(today)}) kesilen {gunOzeti.fisSayisi} fişin özeti. Gerçek yazar kasa Z raporunun yerine
              geçmez - fiziksel cihazda gün sonunu ayrıca almanız gerekir.
            </p>
            <p className="totals-preview muted">
              Ara Toplam: {fmtCurrency(gunOzeti.araToplam)} · KDV: {fmtCurrency(gunOzeti.kdv)} · Genel Toplam:{" "}
              <strong>{fmtCurrency(gunOzeti.toplam)}</strong>
            </p>
            <p className="totals-preview muted">
              Nakit: {fmtCurrency(gunOzeti.nakit)} · Kart: {fmtCurrency(gunOzeti.kart)}
            </p>
            <div className="form-actions">
              <button type="button" className="icon-btn labeled" onClick={() => printReport("x")}>
                <Printer size={16} /> Gün Sonu (X) Yazdır
              </button>
              <button type="button" className="icon-btn labeled danger" onClick={() => printReport("z")}>
                <Printer size={16} /> Z Raporu Al
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ekranda gizli - sadece yazdırma sırasında görünür (bkz. index.css @media print). */}
      <div className="print-area">
        {activeDoc && <FaturaDocument doc={activeDoc} settings={settings} />}
        {activeReport && <GunSonuRaporu ozet={activeReport.ozet} tarih={activeReport.tarih} tur={activeReport.tur} settings={settings} />}
      </div>
    </div>
  );
}
