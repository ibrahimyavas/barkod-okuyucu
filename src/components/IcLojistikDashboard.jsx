import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, PackageCheck, Plus, Pencil, Trash2, X, Search, ScanBarcode, QrCode, Check } from "lucide-react";
import { useDepoTransferleri } from "../hooks/useDepoTransferleri.js";
import { useCameraScanner } from "../hooks/useCameraScanner.js";
import { QR_ONLY_FORMATS, resolveQrOnlyDetector } from "../lib/barcodeDetector.js";
import { parseRoutePayload, parseRouteRef } from "../lib/qrPayload.js";
import { fetchDepoTransfer } from "../lib/api.js";
import { todayISO, trDate, groupByDate } from "../lib/format.js";
import { findCatalogEntry } from "../lib/catalog.js";
import DatePicker from "./DatePicker.jsx";
import CameraPanel from "./CameraPanel.jsx";
import Modal from "./Modal.jsx";

// Etiket Bas'ta bastığımız güzergah QR'ları (bkz. lib/qrPayload.js) burada
// tekrar okunuyor - Lojistik'teki QR modu ile aynı altyapı/kırpma bölgesi.
const QR_CROP_REGION = { widthPct: 0.8, heightPct: 0.8 };

const EMPTY_FORM = {
  barkod: "",
  urunAdi: "",
  miktar: "",
  birim: "",
  kaynakKonum: "",
  hedefKonum: "",
  tarih: todayISO(),
  durum: "planlandi",
  notMetni: "",
};

const DURUM_OPTIONS = [
  { value: "planlandi", label: "Planlandı" },
  { value: "tamamlandi", label: "Tamamlandı" },
];
const DURUM_BADGE_CLASS = { planlandi: "status-beklemede", tamamlandi: "status-odendi" };

function toFormShape(t) {
  return {
    barkod: t.barkod || "",
    urunAdi: t.urunAdi || "",
    miktar: t.miktar ?? "",
    birim: t.birim || "",
    kaynakKonum: t.kaynakKonum || "",
    hedefKonum: t.hedefKonum || "",
    tarih: t.tarih || todayISO(),
    durum: t.durum || "planlandi",
    notMetni: t.notMetni || "",
  };
}

// Mevcut "Lojistik" dış taraflara (müşteri/tedarikçi) giden/gelen
// sevkiyatlar için - bu ekran ise ŞİRKET İÇİ depo/raf arası ürün
// hareketleri için: taraf/cari/araç yok, yalnızca "hangi üründen ne kadarı
// nereden nereye taşındı". Depo düzenleme/envanter yer değişikliği amaçlı.
export default function IcLojistikDashboard({ catalog = [] }) {
  const { transferler, loading, error, addTransfer, updateOne, removeTransfer } = useDepoTransferleri();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [query, setQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lastHit, setLastHit] = useState(null);
  // "Canlı" (ID referanslı) bir QR okutulunca açılan bilgi kartı - bkz.
  // lib/qrPayload.js buildRouteRef/parseRouteRef. liveRecord her okutmada
  // sunucudan TAZE çekiliyor, yerel transferler listesine güvenmiyoruz.
  const [liveRef, setLiveRef] = useState(null);
  const [liveRecord, setLiveRecord] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState(null);
  const [liveHedef, setLiveHedef] = useState("");

  function closeLiveCard() {
    setLiveRef(null);
    setLiveRecord(null);
    setLiveError(null);
  }

  async function handleLiveDurumChange(durum) {
    if (!liveRecord) return;
    await updateOne(liveRecord.id, { durum });
    setLiveRecord((r) => (r ? { ...r, durum } : r));
  }

  async function handleLiveHedefSave() {
    if (!liveRecord) return;
    await updateOne(liveRecord.id, { hedefKonum: liveHedef });
    setLiveRecord((r) => (r ? { ...r, hedefKonum: liveHedef } : r));
  }

  // Etiket Bas'ta bastığımız güzergah QR'ını okutunca formu tek seferde
  // doldurur: barkod/ürün adı + nereden/nereye -> kaynak/hedef konum. Bir
  // "canlı referans" QR'ıysa (buildRouteRef ile basılmış, bkz.
  // LabelPrintDashboard) formu doldurmak yerine o transferin GÜNCEL halini
  // sunucudan çekip bir bilgi kartı açıyoruz. Bizim formatımıza uymayan bir
  // kod okunursa ham değeri düz barkod gibi ele alıyoruz - aşağıdaki katalog
  // eşleşmesi zaten ürün adını doldurur. Kamera açık kalıyor (otomatik
  // kapanmıyor) - kullanıcı "Kapat"a basana kadar art arda tarayabilir.
  const handleQrDetect = useCallback((code) => {
    setLastHit({ code, ts: Date.now() });

    const ref = parseRouteRef(code);
    if (ref) {
      setLiveRef(ref);
      setLiveRecord(null);
      if (ref.tur !== "transfer") {
        setLiveError("Bu QR bir Lojistik sevkiyatına ait - Lojistik ekranından okutun.");
        setLiveLoading(false);
        return;
      }
      setLiveError(null);
      setLiveLoading(true);
      fetchDepoTransfer(ref.id)
        .then((t) => {
          setLiveRecord(t);
          setLiveHedef(t.hedefKonum || "");
        })
        .catch((err) => setLiveError(err.message))
        .finally(() => setLiveLoading(false));
      return;
    }

    const parsed = parseRoutePayload(code);
    setForm((f) => ({
      ...f,
      barkod: parsed?.barkod || code,
      urunAdi: parsed?.urunAdi || f.urunAdi,
      kaynakKonum: parsed?.nereden || f.kaynakKonum,
      hedefKonum: parsed?.nereye || f.hedefKonum,
    }));
  }, []);

  const camera = useCameraScanner({
    enabled: scannerOpen,
    formats: QR_ONLY_FORMATS,
    resolveDetector: resolveQrOnlyDetector,
    cropRegion: QR_CROP_REGION,
    onDetect: handleQrDetect,
  });

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Barkod, Ürün Listesi kataloğundaki bir kayıtla eşleşirse ürün adı/birimi
  // otomatik dolduruyoruz - bkz. lib/catalog.js.
  useEffect(() => {
    if (editingId) return;
    const match = findCatalogEntry(catalog, form.barkod);
    if (!match) return;
    setForm((f) => ({ ...f, urunAdi: match.urunAdi || f.urunAdi, birim: match.birim || f.birim }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.barkod, editingId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transferler;
    return transferler.filter((t) =>
      [t.urunAdi, t.barkod, t.kaynakKonum, t.hedefKonum].some((v) => v?.toLowerCase().includes(q))
    );
  }, [transferler, query]);

  const groups = useMemo(() => groupByDate(filtered, (t) => t.tarih), [filtered]);

  const stats = useMemo(() => {
    const planlanan = transferler.filter((t) => t.durum === "planlandi").length;
    const bugun = transferler.filter((t) => t.tarih === todayISO()).length;
    return { planlanan, bugun };
  }, [transferler]);

  function startEdit(t) {
    setEditingId(t.id);
    setForm(toFormShape(t));
    setSubmitError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, tarih: form.tarih });
    setSubmitError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const urunAdi = form.urunAdi.trim();
    const kaynakKonum = form.kaynakKonum.trim();
    const hedefKonum = form.hedefKonum.trim();
    if (!urunAdi) {
      setSubmitError("Ürün adı zorunlu.");
      return;
    }
    if (!kaynakKonum || !hedefKonum) {
      setSubmitError("Kaynak ve hedef konum zorunlu.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const fields = {
      barkod: form.barkod.trim(),
      urunAdi,
      miktar: form.miktar === "" ? null : Number(form.miktar),
      birim: form.birim.trim(),
      kaynakKonum,
      hedefKonum,
      tarih: form.tarih,
      durum: form.durum,
      notMetni: form.notMetni.trim(),
    };
    try {
      if (editingId) {
        await updateOne(editingId, fields);
        setEditingId(null);
      } else {
        await addTransfer(fields);
      }
      setForm({ ...EMPTY_FORM, tarih: form.tarih });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dashboard">
      <div className="stat-cards">
        <div className="stat-card">
          <ArrowRightLeft size={18} />
          <div>
            <div className="stat-value">{stats.planlanan}</div>
            <div className="stat-label">Planlanan Transfer</div>
          </div>
        </div>
        <div className="stat-card">
          <PackageCheck size={18} />
          <div>
            <div className="stat-value">{stats.bugun}</div>
            <div className="stat-label">Bugün</div>
          </div>
        </div>
      </div>

      <p className="dashboard-hint">
        Şirket içi depo/raf arası ürün hareketleri - müşteri/tedarikçiye giden sevkiyatlar için "Lojistik" sekmesini
        kullanın.
      </p>

      <div className="qr-scan-toggle-row">
        <button
          type="button"
          className={`icon-btn labeled ${scannerOpen ? "active" : ""}`}
          onClick={() => setScannerOpen((v) => !v)}
        >
          <QrCode size={16} />
          {scannerOpen ? "Taramayı Kapat" : "QR ile Transfer Doldur"}
        </button>
      </div>

      {scannerOpen && (
        <CameraPanel
          camera={camera}
          cameraOn={scannerOpen}
          onToggleCamera={() => setScannerOpen(false)}
          scanMode="qr"
          lastHit={lastHit}
        />
      )}

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="il-barkod">
            <ScanBarcode size={14} /> Barkod
          </label>
          <input
            id="il-barkod"
            type="text"
            value={form.barkod}
            onChange={(e) => updateField("barkod", e.target.value)}
            placeholder="Taranan kod ya da elle girin"
            list="il-barkod-list"
          />
          <datalist id="il-barkod-list">
            {catalog.map((c) => (
              <option key={c.id} value={c.barkod}>
                {c.urunAdi}
              </option>
            ))}
          </datalist>
        </div>

        <div className="field">
          <label htmlFor="il-urun">Ürün Adı *</label>
          <input id="il-urun" type="text" value={form.urunAdi} onChange={(e) => updateField("urunAdi", e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="il-miktar">Miktar</label>
          <input
            id="il-miktar"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.miktar}
            onChange={(e) => updateField("miktar", e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="il-birim">Birim</label>
          <input id="il-birim" type="text" placeholder="adet / kg / teneke..." value={form.birim} onChange={(e) => updateField("birim", e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="il-kaynak">Kaynak Konum *</label>
          <input
            id="il-kaynak"
            type="text"
            placeholder="ör. A Deposu / Raf 1"
            value={form.kaynakKonum}
            onChange={(e) => updateField("kaynakKonum", e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="il-hedef">Hedef Konum *</label>
          <input
            id="il-hedef"
            type="text"
            placeholder="ör. B Deposu / Raf 3"
            value={form.hedefKonum}
            onChange={(e) => updateField("hedefKonum", e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="il-tarih">Tarih</label>
          <DatePicker id="il-tarih" value={form.tarih} onChange={(v) => updateField("tarih", v)} />
        </div>

        <div className="field">
          <label htmlFor="il-durum">Durum</label>
          <select id="il-durum" value={form.durum} onChange={(e) => updateField("durum", e.target.value)}>
            {DURUM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field field-wide">
          <label htmlFor="il-not">Not</label>
          <input id="il-not" type="text" value={form.notMetni} onChange={(e) => updateField("notMetni", e.target.value)} />
        </div>

        {submitError && <p className="form-error">{submitError}</p>}

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={submitting}>
            {editingId ? <Pencil size={16} /> : <Plus size={16} />}
            {submitting ? "Kaydediliyor…" : editingId ? "Güncelle" : "Transfer Ekle"}
          </button>
          {editingId && (
            <button type="button" className="icon-btn" onClick={cancelEdit}>
              <X size={16} /> İptal
            </button>
          )}
        </div>
      </form>

      <div className="scan-table-wrap">
        <div className="scan-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Ürün, barkod ya da konumda ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="empty-state">Yükleniyor…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">
            {transferler.length === 0 ? "Henüz transfer kaydı yok." : "Aramayla eşleşen kayıt yok."}
          </p>
        ) : (
          <div className="scan-table-scroll">
            <table className="scan-table">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th>Miktar</th>
                  <th>Kaynak → Hedef</th>
                  <th>Durum</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g.key}>
                    <tr className="date-divider">
                      <td colSpan={5}>{g.label}</td>
                    </tr>
                    {g.items.map((t) => (
                      <tr key={t.id} className={editingId === t.id ? "editing-row" : ""}>
                        <td>
                          {t.urunAdi}
                          {t.barkod && <div className="muted code-cell">{t.barkod}</div>}
                        </td>
                        <td className="muted">
                          {t.miktar != null ? `${t.miktar} ${t.birim || ""}`.trim() : "-"}
                        </td>
                        <td className="muted">
                          {t.kaynakKonum} → {t.hedefKonum}
                        </td>
                        <td>
                          <select
                            className={`status-badge ${DURUM_BADGE_CLASS[t.durum]}`}
                            value={t.durum}
                            onChange={(e) => updateOne(t.id, { durum: e.target.value })}
                          >
                            {DURUM_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="row-actions">
                          <button className="icon-btn" onClick={() => startEdit(t)} aria-label="Düzenle" title="Düzenle">
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-btn danger"
                            onClick={() => removeTransfer(t.id)}
                            aria-label="Sil"
                            title="Sil"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {liveRef && (
        <Modal title="Transfer - Canlı Bilgi" onClose={closeLiveCard}>
          {liveLoading ? (
            <p className="empty-state">Yükleniyor…</p>
          ) : liveError ? (
            <p className="form-error">{liveError}</p>
          ) : liveRecord ? (
            <>
              <dl className="live-card-fields">
                <div className="live-card-row">
                  <dt>Ürün</dt>
                  <dd>{liveRecord.urunAdi}</dd>
                </div>
                <div className="live-card-row">
                  <dt>Miktar</dt>
                  <dd>{liveRecord.miktar != null ? `${liveRecord.miktar} ${liveRecord.birim || ""}`.trim() : "-"}</dd>
                </div>
                <div className="live-card-row">
                  <dt>Kaynak Konum</dt>
                  <dd>{liveRecord.kaynakKonum || "-"}</dd>
                </div>
                <div className="live-card-row">
                  <dt>Tarih</dt>
                  <dd>{trDate(liveRecord.tarih) || "-"}</dd>
                </div>
              </dl>

              <div className="field">
                <label htmlFor="il-live-durum">Durum</label>
                <select
                  id="il-live-durum"
                  className={`status-badge ${DURUM_BADGE_CLASS[liveRecord.durum]}`}
                  value={liveRecord.durum}
                  onChange={(e) => handleLiveDurumChange(e.target.value)}
                >
                  {DURUM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="il-live-hedef">Hedef Konum</label>
                <div className="live-card-location-edit">
                  <input
                    id="il-live-hedef"
                    type="text"
                    value={liveHedef}
                    onChange={(e) => setLiveHedef(e.target.value)}
                  />
                  <button type="button" className="icon-btn" onClick={handleLiveHedefSave} title="Kaydet">
                    <Check size={15} />
                  </button>
                </div>
              </div>

              <p className="dashboard-hint">
                Bu bilgi canlıdır - kaydı güncelledikçe (burada ya da tablodan) aynı etiketi tekrar okutunca güncel
                hali görünür.
              </p>
            </>
          ) : null}
        </Modal>
      )}
    </div>
  );
}
