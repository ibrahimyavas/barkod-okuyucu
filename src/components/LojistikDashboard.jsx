import { Fragment, useMemo, useState } from "react";
import { Truck, PackageCheck, AlertTriangle, Plus, Pencil, Trash2, X, Search } from "lucide-react";
import { useSevkiyatlar } from "../hooks/useSevkiyatlar.js";
import { useCariAccounts } from "../hooks/useCariAccounts.js";
import { todayISO, trDate, isPastDate, groupByDate } from "../lib/format.js";

const EMPTY_FORM = {
  yon: "giden",
  cariId: "",
  tarafAdi: "",
  aracPlakasi: "",
  surucu: "",
  cikisKonumu: "",
  varisKonumu: "",
  planlananTarih: todayISO(),
  durum: "planlandi",
  notMetni: "",
};

const DURUM_OPTIONS = [
  { value: "planlandi", label: "Planlandı" },
  { value: "yolda", label: "Yolda" },
  { value: "teslim_edildi", label: "Teslim Edildi" },
  { value: "iptal", label: "İptal" },
];
const DURUM_BADGE_CLASS = {
  planlandi: "status-beklemede",
  yolda: "status-kismi",
  teslim_edildi: "status-odendi",
  iptal: "status-iptal",
};

function isGecikti(s) {
  return (s.durum === "planlandi" || s.durum === "yolda") && isPastDate(s.planlananTarih);
}

function toFormShape(s) {
  return {
    yon: s.yon || "giden",
    cariId: s.cariId || "",
    tarafAdi: s.tarafAdi || "",
    aracPlakasi: s.aracPlakasi || "",
    surucu: s.surucu || "",
    cikisKonumu: s.cikisKonumu || "",
    varisKonumu: s.varisKonumu || "",
    planlananTarih: s.planlananTarih || todayISO(),
    durum: s.durum || "planlandi",
    notMetni: s.notMetni || "",
  };
}

export default function LojistikDashboard() {
  const { sevkiyatlar, loading, error, addSevkiyat, updateOne, removeSevkiyat } = useSevkiyatlar();
  const { accounts } = useCariAccounts();

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [query, setQuery] = useState("");

  function pickCari(id) {
    const acc = accounts.find((a) => a.id === id);
    setForm((f) => ({ ...f, cariId: id, tarafAdi: acc?.ad || f.tarafAdi }));
  }

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sevkiyatlar;
    return sevkiyatlar.filter((s) => [s.tarafAdi, s.aracPlakasi, s.surucu].some((v) => v?.toLowerCase().includes(q)));
  }, [sevkiyatlar, query]);

  const groups = useMemo(() => groupByDate(filtered, (s) => s.planlananTarih), [filtered]);

  const stats = useMemo(() => {
    const yolda = sevkiyatlar.filter((s) => s.durum === "yolda").length;
    const bugunPlanlanan = sevkiyatlar.filter((s) => s.durum !== "iptal" && s.planlananTarih === todayISO()).length;
    const geciken = sevkiyatlar.filter(isGecikti).length;
    return { yolda, bugunPlanlanan, geciken };
  }, [sevkiyatlar]);

  function startEdit(s) {
    setEditingId(s.id);
    setForm(toFormShape(s));
    setSubmitError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, planlananTarih: form.planlananTarih });
    setSubmitError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const tarafAdi = form.tarafAdi.trim();
    if (!tarafAdi) {
      setSubmitError("Taraf adı zorunlu.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingId) {
        await updateOne(editingId, { ...form, tarafAdi });
        setEditingId(null);
      } else {
        await addSevkiyat({ ...form, tarafAdi });
      }
      setForm({ ...EMPTY_FORM, planlananTarih: form.planlananTarih });
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
          <Truck size={18} />
          <div>
            <div className="stat-value">{stats.yolda}</div>
            <div className="stat-label">Yolda</div>
          </div>
        </div>
        <div className="stat-card">
          <PackageCheck size={18} />
          <div>
            <div className="stat-value">{stats.bugunPlanlanan}</div>
            <div className="stat-label">Bugün Planlanan</div>
          </div>
        </div>
        <div className="stat-card">
          <AlertTriangle size={18} />
          <div>
            <div className="stat-value balance-negative">{stats.geciken}</div>
            <div className="stat-label">Geciken</div>
          </div>
        </div>
      </div>

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="lj-yon">Yön</label>
          <select id="lj-yon" value={form.yon} onChange={(e) => updateField("yon", e.target.value)}>
            <option value="giden">Giden (müşteriye)</option>
            <option value="gelen">Gelen (tedarikçiden)</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="lj-cari">Cari Hesap'tan seç (opsiyonel)</label>
          <select id="lj-cari" value={form.cariId} onChange={(e) => pickCari(e.target.value)}>
            <option value="">— Elle gir —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.ad}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="lj-taraf">Taraf Adı *</label>
          <input
            id="lj-taraf"
            type="text"
            value={form.tarafAdi}
            onChange={(e) => updateField("tarafAdi", e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="lj-plaka">Araç Plakası</label>
          <input id="lj-plaka" type="text" value={form.aracPlakasi} onChange={(e) => updateField("aracPlakasi", e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="lj-surucu">Sürücü</label>
          <input id="lj-surucu" type="text" value={form.surucu} onChange={(e) => updateField("surucu", e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="lj-cikis">Çıkış Konumu</label>
          <input id="lj-cikis" type="text" value={form.cikisKonumu} onChange={(e) => updateField("cikisKonumu", e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="lj-varis">Varış Konumu</label>
          <input id="lj-varis" type="text" value={form.varisKonumu} onChange={(e) => updateField("varisKonumu", e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="lj-tarih">Planlanan Tarih</label>
          <input
            id="lj-tarih"
            type="date"
            value={form.planlananTarih}
            onChange={(e) => updateField("planlananTarih", e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="lj-durum">Durum</label>
          <select id="lj-durum" value={form.durum} onChange={(e) => updateField("durum", e.target.value)}>
            {DURUM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field field-wide">
          <label htmlFor="lj-not">Not</label>
          <input id="lj-not" type="text" value={form.notMetni} onChange={(e) => updateField("notMetni", e.target.value)} />
        </div>

        {submitError && <p className="form-error">{submitError}</p>}

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={submitting}>
            {editingId ? <Pencil size={16} /> : <Plus size={16} />}
            {submitting ? "Kaydediliyor…" : editingId ? "Güncelle" : "Sevkiyat Ekle"}
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
            placeholder="Taraf, plaka ya da sürücüde ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="empty-state">Yükleniyor…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">{sevkiyatlar.length === 0 ? "Henüz sevkiyat kaydı yok." : "Aramayla eşleşen kayıt yok."}</p>
        ) : (
          <div className="scan-table-scroll">
            <table className="scan-table">
              <thead>
                <tr>
                  <th>Yön</th>
                  <th>Taraf</th>
                  <th>Plaka / Sürücü</th>
                  <th>Planlanan</th>
                  <th>Gerçekleşen</th>
                  <th>Durum</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g.key}>
                    <tr className="date-divider">
                      <td colSpan={7}>{g.label}</td>
                    </tr>
                    {g.items.map((s) => (
                      <tr key={s.id} className={editingId === s.id ? "editing-row" : ""}>
                        <td className="muted">{s.yon === "giden" ? "Giden" : "Gelen"}</td>
                        <td>{s.tarafAdi}</td>
                        <td className="muted">
                          {s.aracPlakasi || "-"}
                          {s.surucu ? ` · ${s.surucu}` : ""}
                        </td>
                        <td className="muted">{trDate(s.planlananTarih)}</td>
                        <td className="muted">{trDate(s.gerceklesenTarih)}</td>
                        <td>
                          <select
                            className={`status-badge ${DURUM_BADGE_CLASS[s.durum]}`}
                            value={s.durum}
                            onChange={(e) => updateOne(s.id, { durum: e.target.value })}
                          >
                            {DURUM_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          {isGecikti(s) && (
                            <span className="status-badge status-gecikti" title="Planlanan tarih geçti">
                              Gecikti
                            </span>
                          )}
                        </td>
                        <td className="row-actions">
                          <button
                            className="icon-btn"
                            onClick={() => startEdit(s)}
                            aria-label="Düzenle"
                            title="Düzenle"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-btn danger"
                            onClick={() => removeSevkiyat(s.id)}
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
    </div>
  );
}
