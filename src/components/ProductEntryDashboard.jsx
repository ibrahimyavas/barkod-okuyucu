import { useEffect, useMemo, useState } from "react";
import { Boxes, Wallet, Plus, Trash2, RefreshCw, Search, ScanBarcode } from "lucide-react";
import { useProducts } from "../hooks/useProducts.js";
import { todayISO, trDate, fmtCurrency } from "../lib/format.js";

const EMPTY_FORM = { barkod: "", urunAdi: "", kategori: "", depoKonumu: "", alinisTarihi: todayISO(), maliyet: "" };

export default function ProductEntryDashboard({ prefillBarcode, onConsumePrefill }) {
  const { products, loading, error, addProduct, removeProduct } = useProducts();
  const [form, setForm] = useState(EMPTY_FORM);
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

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.kategori).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [products]);

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

  async function handleSubmit(e) {
    e.preventDefault();
    const urunAdi = form.urunAdi.trim();
    if (!urunAdi) {
      setSubmitError("Ürün adı zorunlu.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await addProduct({
        barkod: form.barkod.trim(),
        urunAdi,
        kategori: form.kategori.trim(),
        depoKonumu: form.depoKonumu.trim(),
        alinisTarihi: form.alinisTarihi,
        maliyet: form.maliyet === "" ? null : Number(form.maliyet),
      });
      setForm({ ...EMPTY_FORM, alinisTarihi: form.alinisTarihi });
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
          />
        </div>

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
          <input
            id="pf-tarih"
            type="date"
            value={form.alinisTarihi}
            onChange={(e) => updateField("alinisTarihi", e.target.value)}
          />
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

        {submitError && <p className="form-error">{submitError}</p>}

        <button type="submit" className="submit-btn" disabled={submitting}>
          <Plus size={16} />
          {submitting ? "Ekleniyor…" : "Ürün Ekle"}
        </button>
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
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.urunAdi}</td>
                    <td className="code-cell">{p.barkod || "-"}</td>
                    <td className="muted">{p.kategori || "-"}</td>
                    <td className="muted">{p.depoKonumu || "-"}</td>
                    <td className="muted">{trDate(p.alinisTarihi)}</td>
                    <td>{fmtCurrency(p.maliyet)}</td>
                    <td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
