import { useEffect, useMemo, useState } from "react";
import { Boxes, Wallet, Plus, Pencil, Trash2, X, RefreshCw, Search, ScanBarcode, TriangleAlert } from "lucide-react";
import { todayISO, trDate, fmtCurrency } from "../lib/format.js";
import { stockStatus } from "../lib/stock.js";
import { findCatalogEntry } from "../lib/catalog.js";
import StockAdjuster from "./StockAdjuster.jsx";
import DatePicker from "./DatePicker.jsx";

const EMPTY_FORM = {
  barkod: "",
  urunAdi: "",
  kategori: "",
  depoKonumu: "",
  alinisTarihi: todayISO(),
  maliyet: "",
  birim: "",
  miktar: "",
  minStok: "",
};

function toFormShape(p) {
  return {
    barkod: p.barkod || "",
    urunAdi: p.urunAdi || "",
    kategori: p.kategori || "",
    depoKonumu: p.depoKonumu || "",
    alinisTarihi: p.alinisTarihi || todayISO(),
    maliyet: p.maliyet ?? "",
    birim: p.birim || "",
    miktar: p.miktar ?? "",
    minStok: p.minStok ?? "",
  };
}

export default function ProductEntryDashboard({
  prefillBarcode,
  onConsumePrefill,
  products,
  loading,
  error,
  addProduct,
  updateProduct,
  removeProduct,
  catalog = [],
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [query, setQuery] = useState("");

  // A code "aktarılan" from the scanner tab lands here once, without
  // clobbering whatever else the user has already typed into the form.
  useEffect(() => {
    if (!prefillBarcode) return;
    setForm((f) => ({ ...f, barkod: prefillBarcode }));
    onConsumePrefill?.();
  }, [prefillBarcode, onConsumePrefill]);

  // Barkod, Ürün Listesi kataloğundaki bir kayıtla eşleşirse ad/kategori/
  // birim'i otomatik dolduruyoruz - aynı barkodu her stok girişinde elle
  // yeniden yazmamak için (bkz. lib/catalog.js). Yalnızca yeni kayıt
  // eklerken (editingId yokken) devreye giriyor; bir ürünü düzenlerken
  // kendi mevcut verisini ezmemeli.
  useEffect(() => {
    if (editingId) return;
    const match = findCatalogEntry(catalog, form.barkod);
    if (!match) return;
    setForm((f) => ({
      ...f,
      urunAdi: match.urunAdi || f.urunAdi,
      kategori: match.kategori || f.kategori,
      birim: match.birim || f.birim,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.barkod, editingId]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.kategori).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [products]);

  // "Stok ekledim ama hâlâ tükenmiş görünüyor" hatasının gerçek nedeni:
  // aynı barkodla tekrar "Ürün Ekle" basmak yeni bir SATIR açıyordu - eski
  // (stoksuz) kayıt olduğu gibi kalıp Düşük Stok'ta görünmeye devam
  // ediyordu, kullanıcı farkında olmadan bir kopya oluşturuyordu. Barkod
  // alanı mevcut bir ürünle eşleştiğinde (ve o ürünü zaten düzenlemiyorsak)
  // bunu tespit edip kopya oluşturmak yerine düzenlemeye yönlendiriyoruz.
  const barcodeConflict = useMemo(() => {
    const code = form.barkod.trim();
    if (!code || editingId) return null;
    return products.find((p) => p.barkod === code) || null;
  }, [form.barkod, editingId, products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.urunAdi, p.barkod, p.kategori, p.depoKonumu].some((v) => v?.toLowerCase().includes(q))
    );
  }, [products, query]);

  const stats = useMemo(() => {
    const totalCost = products.reduce((sum, p) => sum + (Number(p.maliyet) || 0), 0);
    return { count: products.length, totalCost };
  }, [products]);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm(toFormShape(p));
    setSubmitError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, alinisTarihi: form.alinisTarihi });
    setSubmitError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const urunAdi = form.urunAdi.trim();
    if (!urunAdi) {
      setSubmitError("Ürün adı zorunlu.");
      return;
    }
    if (barcodeConflict) {
      // Sessizce kopya oluşturmak yerine reddet - kullanıcı zaten aşağıdaki
      // uyarıdan "Bu ürünü düzenle"ye tıklayabilir.
      setSubmitError(
        `Bu barkod zaten "${barcodeConflict.urunAdi}" için kayıtlı. Kopya oluşturmamak için aşağıdaki "Bu ürünü düzenle" ile stoğu güncelleyin.`
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const fields = {
      barkod: form.barkod.trim(),
      urunAdi,
      kategori: form.kategori.trim(),
      depoKonumu: form.depoKonumu.trim(),
      alinisTarihi: form.alinisTarihi,
      maliyet: form.maliyet === "" ? null : Number(form.maliyet),
      birim: form.birim.trim(),
      miktar: form.miktar === "" ? null : Number(form.miktar),
      minStok: form.minStok === "" ? null : Number(form.minStok),
    };
    try {
      if (editingId) {
        await updateProduct(editingId, fields);
        setEditingId(null);
        setForm({ ...EMPTY_FORM, alinisTarihi: form.alinisTarihi });
      } else {
        await addProduct(fields);
        setForm({ ...EMPTY_FORM, alinisTarihi: form.alinisTarihi });
      }
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
          <Boxes size={18} />
          <div>
            <div className="stat-value">{stats.count}</div>
            <div className="stat-label">Ürün</div>
          </div>
        </div>
        <div className="stat-card">
          <Wallet size={18} />
          <div>
            <div className="stat-value">{fmtCurrency(stats.totalCost)}</div>
            <div className="stat-label">Toplam Maliyet</div>
          </div>
        </div>
      </div>

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="pf-barkod">
            <ScanBarcode size={14} /> Barkod
          </label>
          <input
            id="pf-barkod"
            type="text"
            value={form.barkod}
            onChange={(e) => updateField("barkod", e.target.value)}
            placeholder="Taranan kod ya da elle girin"
            list="pf-barkod-list"
          />
          <datalist id="pf-barkod-list">
            {catalog.map((c) => (
              <option key={c.id} value={c.barkod}>
                {c.urunAdi}
              </option>
            ))}
          </datalist>
        </div>

        {barcodeConflict && (
          <p className="field-hint field-hint-warning field-wide">
            <TriangleAlert size={13} />
            Bu barkod zaten <strong>{barcodeConflict.urunAdi}</strong> için kayıtlı (stok:{" "}
            {barcodeConflict.miktar ?? "-"} {barcodeConflict.birim || ""}).{" "}
            <button type="button" className="link-btn" onClick={() => startEdit(barcodeConflict)}>
              Bu ürünü düzenle
            </button>
          </p>
        )}

        <div className="field">
          <label htmlFor="pf-ad">Ürün Adı *</label>
          <input
            id="pf-ad"
            type="text"
            value={form.urunAdi}
            onChange={(e) => updateField("urunAdi", e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="pf-kategori">Kategori</label>
          <input
            id="pf-kategori"
            type="text"
            list="pf-kategori-list"
            value={form.kategori}
            onChange={(e) => updateField("kategori", e.target.value)}
          />
          <datalist id="pf-kategori-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="field">
          <label htmlFor="pf-konum">Depo / Raf Konumu</label>
          <input
            id="pf-konum"
            type="text"
            value={form.depoKonumu}
            onChange={(e) => updateField("depoKonumu", e.target.value)}
            placeholder="ör. A Deposu / Raf 3"
          />
        </div>

        <div className="field">
          <label htmlFor="pf-tarih">Alınış Tarihi</label>
          <DatePicker id="pf-tarih" value={form.alinisTarihi} onChange={(v) => updateField("alinisTarihi", v)} />
        </div>

        <div className="field">
          <label htmlFor="pf-maliyet">Maliyet (₺)</label>
          <input
            id="pf-maliyet"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.maliyet}
            onChange={(e) => updateField("maliyet", e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="pf-birim">Birim</label>
          <input
            id="pf-birim"
            type="text"
            placeholder="adet / kg / teneke..."
            value={form.birim}
            onChange={(e) => updateField("birim", e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="pf-miktar">Mevcut Stok</label>
          <input
            id="pf-miktar"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.miktar}
            onChange={(e) => updateField("miktar", e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="pf-minstok">Min. Stok Seviyesi</label>
          <input
            id="pf-minstok"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.minStok}
            onChange={(e) => updateField("minStok", e.target.value)}
            placeholder="boş = takip etme"
          />
        </div>

        {submitError && <p className="form-error">{submitError}</p>}

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={submitting}>
            {editingId ? <Pencil size={16} /> : <Plus size={16} />}
            {submitting ? "Kaydediliyor…" : editingId ? "Güncelle" : "Ürün Ekle"}
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
            placeholder="Ürün, barkod, kategori ya da konumda ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="empty-state">
            <RefreshCw size={14} className="spin" /> Yükleniyor…
          </p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">
            {products.length === 0 ? "Henüz ürün girişi yapılmadı." : "Aramayla eşleşen ürün yok."}
          </p>
        ) : (
          <div className="scan-table-scroll">
            <table className="scan-table">
              <thead>
                <tr>
                  <th>Ürün Adı</th>
                  <th>Barkod</th>
                  <th>Kategori</th>
                  <th>Konum</th>
                  <th>Alınış Tarihi</th>
                  <th>Maliyet</th>
                  <th>Stok</th>
                  <th>Min.</th>
                  <th>Durum</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const status = stockStatus(p.miktar, p.minStok);
                  return (
                    <tr key={p.id} className={editingId === p.id ? "editing-row" : ""}>
                      <td>{p.urunAdi}</td>
                      <td className="code-cell">{p.barkod || "-"}</td>
                      <td className="muted">{p.kategori || "-"}</td>
                      <td className="muted">{p.depoKonumu || "-"}</td>
                      <td className="muted">{trDate(p.alinisTarihi)}</td>
                      <td>{fmtCurrency(p.maliyet)}</td>
                      <td>
                        <StockAdjuster value={p.miktar} onSave={(v) => updateProduct(p.id, { miktar: v })} />
                        {p.birim && <span className="muted unit-suffix">{p.birim}</span>}
                      </td>
                      <td>
                        <StockAdjuster value={p.minStok} onSave={(v) => updateProduct(p.id, { minStok: v })} />
                      </td>
                      <td className={status.cls}>{status.label}</td>
                      <td className="row-actions">
                        <button className="icon-btn" onClick={() => startEdit(p)} aria-label="Düzenle" title="Düzenle">
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-btn danger"
                          onClick={() => removeProduct(p.id)}
                          aria-label="Sil"
                          title="Sil"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
