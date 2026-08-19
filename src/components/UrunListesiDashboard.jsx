import { useMemo, useState } from "react";
import { ClipboardList, ScanBarcode, Plus, Pencil, Trash2, X, Search } from "lucide-react";
import { useScanStore } from "../hooks/useScanStore.js";
import UncatalogedScansPanel from "./UncatalogedScansPanel.jsx";

const EMPTY_FORM = { barkod: "", urunAdi: "", kategori: "", birim: "" };

function toFormShape(c) {
  return {
    barkod: c.barkod || "",
    urunAdi: c.urunAdi || "",
    kategori: c.kategori || "",
    birim: c.birim || "",
  };
}

// Ürün Girişi, Satın Alma ve Lojistik'in "barkodu okuttuğumda ürün adı falan
// otomatik gelsin" ihtiyacının kaynağı: bir barkod hangi ürüne karşılık
// geliyor, bunu TEK bir yerde tanımlıyoruz. Stok/maliyet gibi hareket
// verisi taşımıyor - yalnızca kimlik (bkz. lib/catalog.js, worker/urunKatalog.js).
export default function UrunListesiDashboard({ catalog, loading, error, addEntry, updateEntry, removeEntry }) {
  const { scans } = useScanStore();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [query, setQuery] = useState("");

  const categories = useMemo(() => {
    const set = new Set(catalog.map((c) => c.kategori).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [catalog]);

  const barcodeConflict = useMemo(() => {
    const code = form.barkod.trim();
    if (!code || editingId) return null;
    return catalog.find((c) => c.barkod === code) || null;
  }, [form.barkod, editingId, catalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((c) => [c.urunAdi, c.barkod, c.kategori].some((v) => v?.toLowerCase().includes(q)));
  }, [catalog, query]);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(c) {
    setEditingId(c.id);
    setForm(toFormShape(c));
    setSubmitError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSubmitError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const barkod = form.barkod.trim();
    const urunAdi = form.urunAdi.trim();
    if (!barkod) {
      setSubmitError("Barkod zorunlu.");
      return;
    }
    if (!urunAdi) {
      setSubmitError("Ürün adı zorunlu.");
      return;
    }
    if (barcodeConflict) {
      setSubmitError(`Bu barkod zaten "${barcodeConflict.urunAdi}" için kayıtlı. Kopya oluşturmak yerine düzenleyin.`);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const fields = { barkod, urunAdi, kategori: form.kategori.trim(), birim: form.birim.trim() };
    try {
      if (editingId) {
        await updateEntry(editingId, fields);
        setEditingId(null);
      } else {
        await addEntry(fields);
      }
      setForm(EMPTY_FORM);
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
          <ClipboardList size={18} />
          <div>
            <div className="stat-value">{catalog.length}</div>
            <div className="stat-label">Kayıtlı Ürün</div>
          </div>
        </div>
      </div>

      <p className="dashboard-hint">
        Barkod-ürün eşlemesini burada bir kez tanımlayın - Ürün Girişi, Satın Alma ve Lojistik'te aynı barkodu
        yazdığınızda ürün adı (ve kategori/birim) otomatik dolar.
      </p>

      <UncatalogedScansPanel
        scans={scans}
        catalog={catalog}
        onPick={(code) => {
          setEditingId(null);
          setForm({ ...EMPTY_FORM, barkod: code });
        }}
      />

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="uk-barkod">
            <ScanBarcode size={14} /> Barkod *
          </label>
          <input
            id="uk-barkod"
            type="text"
            value={form.barkod}
            onChange={(e) => updateField("barkod", e.target.value)}
            placeholder="Taranan kod ya da elle girin"
          />
        </div>

        <div className="field">
          <label htmlFor="uk-ad">Ürün Adı *</label>
          <input id="uk-ad" type="text" value={form.urunAdi} onChange={(e) => updateField("urunAdi", e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="uk-kategori">Kategori</label>
          <input
            id="uk-kategori"
            type="text"
            list="uk-kategori-list"
            value={form.kategori}
            onChange={(e) => updateField("kategori", e.target.value)}
          />
          <datalist id="uk-kategori-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="field">
          <label htmlFor="uk-birim">Birim</label>
          <input
            id="uk-birim"
            type="text"
            placeholder="adet / kg / teneke..."
            value={form.birim}
            onChange={(e) => updateField("birim", e.target.value)}
          />
        </div>

        {barcodeConflict && (
          <p className="field-hint field-hint-warning field-wide">
            Bu barkod zaten <strong>{barcodeConflict.urunAdi}</strong> için kayıtlı.{" "}
            <button type="button" className="link-btn" onClick={() => startEdit(barcodeConflict)}>
              Bu ürünü düzenle
            </button>
          </p>
        )}

        {submitError && <p className="form-error">{submitError}</p>}

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={submitting}>
            {editingId ? <Pencil size={16} /> : <Plus size={16} />}
            {submitting ? "Kaydediliyor…" : editingId ? "Güncelle" : "Kataloğa Ekle"}
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
            placeholder="Ürün, barkod ya da kategoride ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="empty-state">Yükleniyor…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">
            {catalog.length === 0
              ? "Henüz katalog kaydı yok. Barkod okuttukça burada birikir."
              : "Aramayla eşleşen kayıt yok."}
          </p>
        ) : (
          <div className="scan-table-scroll">
            <table className="scan-table">
              <thead>
                <tr>
                  <th>Ürün Adı</th>
                  <th>Barkod</th>
                  <th>Kategori</th>
                  <th>Birim</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className={editingId === c.id ? "editing-row" : ""}>
                    <td>{c.urunAdi}</td>
                    <td className="code-cell">{c.barkod}</td>
                    <td className="muted">{c.kategori || "-"}</td>
                    <td className="muted">{c.birim || "-"}</td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => startEdit(c)} aria-label="Düzenle" title="Düzenle">
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => removeEntry(c.id)}
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
