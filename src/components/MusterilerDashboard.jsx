import { useMemo, useState } from "react";
import { Users, Plus, Pencil, Trash2, X, Search } from "lucide-react";

const EMPTY_FORM = { ad: "", yetkili: "", telefon: "", adres: "" };

// Satış tarafındaki şirketler - burada tanımlanan müşteriler Satış, Fatura
// ve Lojistik'te ("giden" yön) seçenek olarak otomatik geliyor (bkz.
// App.jsx - customers listesi tek yerden çekilip prop olarak veriliyor).
// TedarikcilerDashboard.jsx ile bilinçli olarak aynı desen/alanlar.
export default function MusterilerDashboard({ customers, loading, error, addCustomer, editCustomer, removeCustomer }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => [c.ad, c.yetkili, c.telefon].some((v) => v?.toLowerCase().includes(q)));
  }, [customers, query]);

  function startEdit(c) {
    setEditingId(c.id);
    setForm({ ad: c.ad || "", yetkili: c.yetkili || "", telefon: c.telefon || "", adres: c.adres || "" });
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
      setSubmitError("Müşteri adı zorunlu.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingId) {
        await editCustomer(editingId, { ...form, ad });
        setEditingId(null);
      } else {
        await addCustomer({ ...form, ad });
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
          <Users size={18} />
          <div>
            <div className="stat-value">{customers.length}</div>
            <div className="stat-label">Müşteri</div>
          </div>
        </div>
      </div>

      <p className="dashboard-hint">
        Burada tanımladığınız müşteriler Satış, Fatura ve Lojistik'te ("giden" yön) seçenek olarak otomatik gelir.
      </p>

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="ms-ad">Müşteri Adı *</label>
          <input id="ms-ad" type="text" value={form.ad} onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))} required />
        </div>
        <div className="field">
          <label htmlFor="ms-yetkili">Yetkili</label>
          <input id="ms-yetkili" type="text" value={form.yetkili} onChange={(e) => setForm((f) => ({ ...f, yetkili: e.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="ms-telefon">Telefon</label>
          <input id="ms-telefon" type="text" value={form.telefon} onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))} />
        </div>
        <div className="field field-wide">
          <label htmlFor="ms-adres">Adres</label>
          <input id="ms-adres" type="text" value={form.adres} onChange={(e) => setForm((f) => ({ ...f, adres: e.target.value }))} />
        </div>

        {submitError && <p className="form-error">{submitError}</p>}

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={submitting}>
            {editingId ? <Pencil size={16} /> : <Plus size={16} />}
            {submitting ? "Kaydediliyor…" : editingId ? "Güncelle" : "Müşteri Ekle"}
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
          <p className="empty-state">{customers.length === 0 ? "Henüz müşteri eklenmedi." : "Aramayla eşleşen kayıt yok."}</p>
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
                {filtered.map((c) => (
                  <tr key={c.id} className={editingId === c.id ? "editing-row" : ""}>
                    <td>{c.ad}</td>
                    <td className="muted">{c.yetkili || "-"}</td>
                    <td className="muted">{c.telefon || "-"}</td>
                    <td className="muted">{c.adres || "-"}</td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => startEdit(c)} aria-label="Düzenle" title="Düzenle">
                        <Pencil size={15} />
                      </button>
                      <button className="icon-btn danger" onClick={() => removeCustomer(c.id)} aria-label="Sil" title="Sil">
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
