import { Fragment, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, PackageCheck, Plus, Pencil, Trash2, X, Search, ScanBarcode } from "lucide-react";
import { useDepoTransferleri } from "../hooks/useDepoTransferleri.js";
import { todayISO, trDate, groupByDate } from "../lib/format.js";
import { findCatalogEntry } from "../lib/catalog.js";
import DatePicker from "./DatePicker.jsx";

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
    </div>
  );
}
