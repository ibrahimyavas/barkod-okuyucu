import { useMemo, useState } from "react";
import { Building2, Plus, Pencil, Trash2, X, Search } from "lucide-react";

const EMPTY_FORM = { ad: "", yetkili: "", telefon: "", adres: "" };

// Alış tarafındaki şirketler - burada tanımlanan tedarikçiler Satın Alma,
// Fatura ve Lojistik'te ("gelen" yön) seçenek olarak otomatik geliyor
// (bkz. App.jsx - suppliers listesi tek yerden çekilip prop olarak veriliyor).
export default function TedarikcilerDashboard({ suppliers, loading, error, addSupplier, editSupplier, removeSupplier }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => [s.ad, s.yetkili, s.telefon].some((v) => v?.toLowerCase().includes(q)));
  }, [suppliers, query]);

  function startEdit(s) {
    setEditingId(s.id);
    setForm({ ad: s.ad || "", yetkili: s.yetkili || "", telefon: s.telefon || "", adres: s.adres || "" });
    setSubmitError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSubmitError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const ad = form.ad.trim();
    if (!ad) {
      setSubmitError("Tedarikçi adı zorunlu.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingId) {
        await editSupplier(editingId, { ...form, ad });
        setEditingId(null);
      } else {
        await addSupplier({ ...form, ad });
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
          <Building2 size={18} />
          <div>
            <div className="stat-value">{suppliers.length}</div>
            <div className="stat-label">Tedarikçi</div>
          </div>
        </div>
      </div>

      <p className="dashboard-hint">
        Burada tanımladığınız tedarikçiler Satın Alma, Fatura ve Lojistik'te ("gelen" yön) seçenek olarak otomatik
        gelir.
      </p>

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="td-ad">Tedarikçi Adı *</label>
          <input id="td-ad" type="text" value={form.ad} onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))} required />
        </div>
        <div className="field">
          <label htmlFor="td-yetkili">Yetkili</label>
          <input id="td-yetkili" type="text" value={form.yetkili} onChange={(e) => setForm((f) => ({ ...f, yetkili: e.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="td-telefon">Telefon</label>
          <input id="td-telefon" type="text" value={form.telefon} onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))} />
        </div>
        <div className="field field-wide">
          <label htmlFor="td-adres">Adres</label>
          <input id="td-adres" type="text" value={form.adres} onChange={(e) => setForm((f) => ({ ...f, adres: e.target.value }))} />
        </div>

        {submitError && <p className="form-error">{submitError}</p>}

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={submitting}>
            {editingId ? <Pencil size={16} /> : <Plus size={16} />}
            {submitting ? "Kaydediliyor…" : editingId ? "Güncelle" : "Tedarikçi Ekle"}
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
          <input type="text" placeholder="Ad, yetkili ya da telefonda ara…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="empty-state">Yükleniyor…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">{suppliers.length === 0 ? "Henüz tedarikçi eklenmedi." : "Aramayla eşleşen kayıt yok."}</p>
        ) : (
          <div className="scan-table-scroll">
            <table className="scan-table">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Yetkili</th>
                  <th>Telefon</th>
                  <th>Adres</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className={editingId === s.id ? "editing-row" : ""}>
                    <td>{s.ad}</td>
                    <td className="muted">{s.yetkili || "-"}</td>
                    <td className="muted">{s.telefon || "-"}</td>
                    <td className="muted">{s.adres || "-"}</td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => startEdit(s)} aria-label="Düzenle" title="Düzenle">
                        <Pencil size={15} />
                      </button>
                      <button className="icon-btn danger" onClick={() => removeSupplier(s.id)} aria-label="Sil" title="Sil">
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
