import { useMemo, useState } from "react";
import { Plus, Trash2, Printer, Tag } from "lucide-react";
import { useProducts } from "../hooks/useProducts.js";
import { useSevkiyatlar } from "../hooks/useSevkiyatlar.js";
import { useLabelQueue } from "../hooks/useLabelQueue.js";
import { buildRoutePayload } from "../lib/qrPayload.js";
import BarcodeLabel from "./BarcodeLabel.jsx";

const FORMAT_OPTIONS = [
  { value: "code_128", label: "Code 128 (genel amaçlı, önerilen)" },
  { value: "ean_13", label: "EAN-13" },
  { value: "ean_8", label: "EAN-8" },
  { value: "upc_a", label: "UPC-A" },
  { value: "upc_e", label: "UPC-E" },
  { value: "code_39", label: "Code 39" },
  { value: "itf", label: "ITF" },
  { value: "codabar", label: "Codabar" },
  { value: "qr_code", label: "QR Kod" },
];

const EMPTY_FORM = { barkod: "", urunAdi: "", fiyat: "", format: "code_128", nereden: "", nereye: "" };

export default function LabelPrintDashboard() {
  const { products } = useProducts();
  const { sevkiyatlar } = useSevkiyatlar();
  const { items, addItem, updateCount, removeItem, clearAll } = useLabelQueue();
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSevkiyatId, setSelectedSevkiyatId] = useState("");

  const isQr = form.format === "qr_code";

  function pickProduct(id) {
    setSelectedProductId(id);
    const p = products.find((pr) => pr.id === id);
    if (p) {
      setForm((f) => ({
        ...f,
        barkod: p.barkod || "",
        urunAdi: p.urunAdi,
        fiyat: p.maliyet != null ? String(p.maliyet) : "",
      }));
    }
  }

  // Sadece güzergahı (nereden/nereye) dolduruyor - ürün kimliği hâlâ ayrı,
  // Ürün Girişi seçicisinden ya da elle geliyor. Lojistik kayıtlarında ürün
  // bilgisi yok, sadece taraf/plaka/güzergah var.
  function pickSevkiyat(id) {
    setSelectedSevkiyatId(id);
    const s = sevkiyatlar.find((sv) => sv.id === id);
    if (s) {
      setForm((f) => ({
        ...f,
        nereden: s.cikisKonumu || f.nereden,
        nereye: s.varisKonumu || f.nereye,
      }));
    }
  }

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleAdd(e) {
    e.preventDefault();
    const barkod = form.barkod.trim();
    if (!barkod) return;
    const urunAdi = form.urunAdi.trim();
    const nereden = form.nereden.trim();
    const nereye = form.nereye.trim();
    const hasRoute = isQr && (nereden || nereye);
    addItem({
      barkod,
      urunAdi,
      fiyat: form.fiyat === "" ? null : Number(form.fiyat),
      format: form.format,
      nereden: hasRoute ? nereden : "",
      nereye: hasRoute ? nereye : "",
      qrPayload: hasRoute ? buildRoutePayload({ urunAdi, barkod, nereden, nereye }) : null,
    });
  }

  const totalLabels = useMemo(() => items.reduce((sum, it) => sum + it.adet, 0), [items]);

  return (
    <div className="dashboard">
      <div className="stat-cards">
        <div className="stat-card">
          <Tag size={18} />
          <div>
            <div className="stat-value">{items.length}</div>
            <div className="stat-label">Kuyrukta Ürün</div>
          </div>
        </div>
        <div className="stat-card">
          <Printer size={18} />
          <div>
            <div className="stat-value">{totalLabels}</div>
            <div className="stat-label">Toplam Etiket</div>
          </div>
        </div>
      </div>

      <form className="product-form" onSubmit={handleAdd}>
        <div className="field field-wide">
          <label htmlFor="lb-urun-sec">Ürün Girişi'nden seç (opsiyonel)</label>
          <select id="lb-urun-sec" value={selectedProductId} onChange={(e) => pickProduct(e.target.value)}>
            <option value="">— Elle gir —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.urunAdi}
                {p.barkod ? ` (${p.barkod})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="lb-kod">Kod *</label>
          <input id="lb-kod" type="text" value={form.barkod} onChange={(e) => updateField("barkod", e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="lb-ad">Ürün Adı</label>
          <input id="lb-ad" type="text" value={form.urunAdi} onChange={(e) => updateField("urunAdi", e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="lb-fiyat">Fiyat (₺, opsiyonel)</label>
          <input
            id="lb-fiyat"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.fiyat}
            onChange={(e) => updateField("fiyat", e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="lb-format">Format</label>
          <select id="lb-format" value={form.format} onChange={(e) => updateField("format", e.target.value)}>
            {FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {isQr && (
          <>
            <div className="field field-wide">
              <label htmlFor="lb-sevkiyat-sec">Sevkiyattan güzergah doldur (opsiyonel)</label>
              <select id="lb-sevkiyat-sec" value={selectedSevkiyatId} onChange={(e) => pickSevkiyat(e.target.value)}>
                <option value="">— Elle gir —</option>
                {sevkiyatlar.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.tarafAdi} ({s.cikisKonumu || "?"} → {s.varisKonumu || "?"})
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="lb-nereden">Nereden</label>
              <input id="lb-nereden" type="text" value={form.nereden} onChange={(e) => updateField("nereden", e.target.value)} />
            </div>

            <div className="field">
              <label htmlFor="lb-nereye">Nereye</label>
              <input id="lb-nereye" type="text" value={form.nereye} onChange={(e) => updateField("nereye", e.target.value)} />
            </div>
          </>
        )}

        <div className="field field-wide">
          <label>Önizleme</label>
          {form.barkod ? (
            <BarcodeLabel
              barkod={form.barkod}
              urunAdi={form.urunAdi}
              fiyat={form.fiyat === "" ? null : Number(form.fiyat)}
              format={form.format}
              nereden={isQr ? form.nereden : ""}
              nereye={isQr ? form.nereye : ""}
              qrPayload={
                isQr && (form.nereden || form.nereye)
                  ? buildRoutePayload({ urunAdi: form.urunAdi, barkod: form.barkod, nereden: form.nereden, nereye: form.nereye })
                  : null
              }
            />
          ) : (
            <p className="empty-state">Önizleme için bir kod girin.</p>
          )}
        </div>

        <button type="submit" className="submit-btn" disabled={!form.barkod.trim()}>
          <Plus size={16} />
          Kuyruğa Ekle
        </button>
      </form>

      <div className="scan-table-wrap">
        {items.length === 0 ? (
          <p className="empty-state">Kuyruk boş. Yukarıdan etiket ekleyin.</p>
        ) : (
          <>
            <div className="scan-table-scroll">
              <table className="scan-table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Kod</th>
                    <th>Format</th>
                    <th>Güzergah</th>
                    <th>Adet</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.urunAdi || "-"}</td>
                      <td className="code-cell">{it.barkod}</td>
                      <td className="muted">{FORMAT_OPTIONS.find((o) => o.value === it.format)?.label.split(" (")[0] || it.format}</td>
                      <td className="muted">{it.nereden || it.nereye ? `${it.nereden || "?"} → ${it.nereye || "?"}` : "-"}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="qty-input"
                          value={it.adet}
                          onChange={(e) => updateCount(it.id, Number(e.target.value) || 1)}
                        />
                      </td>
                      <td>
                        <button className="icon-btn danger" onClick={() => removeItem(it.id)} aria-label="Sil" title="Sil">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="toolbar">
              <div className="toolbar-group">
                <button type="button" className="icon-btn labeled danger" onClick={clearAll}>
                  <Trash2 size={16} />
                  Kuyruğu Temizle
                </button>
              </div>
              <div className="toolbar-group">
                <button type="button" className="submit-btn" onClick={() => window.print()}>
                  <Printer size={16} />
                  Yazdır ({totalLabels} etiket)
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Ekranda gizli - sadece yazdırma sırasında görünür (bkz. index.css @media print). */}
      <div className="print-area">
        {items.flatMap((it) =>
          Array.from({ length: it.adet }, (_, i) => (
            <BarcodeLabel
              key={`${it.id}-${i}`}
              barkod={it.barkod}
              urunAdi={it.urunAdi}
              fiyat={it.fiyat}
              format={it.format}
              qrPayload={it.qrPayload}
              nereden={it.nereden}
              nereye={it.nereye}
            />
          ))
        )}
      </div>
    </div>
  );
}
