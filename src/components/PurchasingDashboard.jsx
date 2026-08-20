import { Fragment, useEffect, useMemo, useState } from "react";
import { Wallet, Clock, Users, Plus, Pencil, Trash2, X, Search } from "lucide-react";
import { usePurchases } from "../hooks/usePurchases.js";
import { useCariAccounts } from "../hooks/useCariAccounts.js";
import { todayISO, trDate, fmtCurrency, groupByDate } from "../lib/format.js";
import { findCatalogEntry } from "../lib/catalog.js";
import DatePicker from "./DatePicker.jsx";

const EMPTY_PURCHASE = {
  supplierId: "",
  urunAdi: "",
  barkod: "",
  miktar: "",
  birim: "",
  birimFiyat: "",
  toplamTutar: "",
  odemeDurumu: "beklemede",
  tarih: todayISO(),
  notMetni: "",
  vergiOrani: "",
  cariId: "",
  postToCari: false,
};

const STATUS_LABEL = { beklemede: "Beklemede", kismi: "Kısmi", odendi: "Ödendi" };
const STATUS_NEXT = { beklemede: "kismi", kismi: "odendi", odendi: "beklemede" };

function purchaseToFormShape(p) {
  return {
    supplierId: p.supplierId || "",
    urunAdi: p.urunAdi || "",
    barkod: p.barkod || "",
    miktar: p.miktar ?? "",
    birim: p.birim || "",
    birimFiyat: p.birimFiyat ?? "",
    toplamTutar: p.toplamTutar ?? "",
    odemeDurumu: p.odemeDurumu || "beklemede",
    tarih: p.tarih || todayISO(),
    notMetni: p.notMetni || "",
    vergiOrani: p.vergiOrani ?? "",
    toplamTutarTouched: true, // don't fight the user's/loaded values with auto-calc on first edit
  };
}

// Tedarikçi tanımlama artık ayrı bir ekranda (bkz. TedarikcilerDashboard.jsx)
// - burası yalnızca listeden seçiyor. `suppliers` App.jsx'te tek yerden
// çekiliyor, böylece Tedarikçiler'de eklenen bir kayıt buraya (ve Fatura/
// Lojistik'e) otomatik yansıyor.
export default function PurchasingDashboard({ catalog = [], suppliers = [] }) {
  const { purchases, loading, error, addPurchase, cycleStatus, editPurchase, removePurchase } = usePurchases();
  const { accounts } = useCariAccounts();

  const [form, setForm] = useState(EMPTY_PURCHASE);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [query, setQuery] = useState("");

  // Barkod, Ürün Listesi kataloğundaki bir kayıtla eşleşirse ürün adı ve
  // birimi otomatik dolduruyoruz - bkz. lib/catalog.js. Yalnızca yeni kayıt
  // eklerken (düzenleme dışında) devreye giriyor.
  useEffect(() => {
    if (editingId) return;
    const match = findCatalogEntry(catalog, form.barkod);
    if (!match) return;
    setForm((f) => ({ ...f, urunAdi: match.urunAdi || f.urunAdi, birim: match.birim || f.birim }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.barkod, editingId]);

  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return purchases;
    return purchases.filter((p) =>
      [p.urunAdi, p.barkod, p.tedarikciAdi].some((v) => v?.toLowerCase().includes(q))
    );
  }, [purchases, query]);

  const groups = useMemo(() => groupByDate(filtered, (p) => p.tarih), [filtered]);

  const stats = useMemo(() => {
    let total = 0;
    let pending = 0;
    for (const p of purchases) {
      const tutar = Number(p.toplamTutar) || 0;
      total += tutar;
      if (p.odemeDurumu !== "odendi") pending += tutar;
    }
    return { total, pending, supplierCount: suppliers.length };
  }, [purchases, suppliers]);

  function updateField(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      // Toplam tutarı elle değiştirmediği sürece miktar/birim fiyattan otomatik hesapla.
      if ((field === "miktar" || field === "birimFiyat") && !f.toplamTutarTouched) {
        const miktar = Number(field === "miktar" ? value : f.miktar);
        const birimFiyat = Number(field === "birimFiyat" ? value : f.birimFiyat);
        if (Number.isFinite(miktar) && Number.isFinite(birimFiyat) && f.miktar !== "" && f.birimFiyat !== "") {
          next.toplamTutar = String(Math.round(miktar * birimFiyat * 100) / 100);
        }
      }
      if (field === "toplamTutar") next.toplamTutarTouched = true;
      return next;
    });
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm(purchaseToFormShape(p));
    setSubmitError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...EMPTY_PURCHASE, supplierId: form.supplierId, tarih: form.tarih });
    setSubmitError(null);
  }

  async function handlePurchaseSubmit(e) {
    e.preventDefault();
    const urunAdi = form.urunAdi.trim();
    if (!urunAdi) {
      setSubmitError("Ürün adı zorunlu.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const supplier = supplierById.get(form.supplierId);
    const fields = {
      supplierId: form.supplierId || null,
      tedarikciAdi: supplier?.ad || "",
      urunAdi,
      barkod: form.barkod.trim(),
      miktar: form.miktar === "" ? null : Number(form.miktar),
      birim: form.birim.trim(),
      birimFiyat: form.birimFiyat === "" ? null : Number(form.birimFiyat),
      toplamTutar: form.toplamTutar === "" ? null : Number(form.toplamTutar),
      odemeDurumu: form.odemeDurumu,
      tarih: form.tarih,
      notMetni: form.notMetni.trim(),
      vergiOrani: form.vergiOrani === "" ? null : Number(form.vergiOrani),
      // Yalnızca yeni kayıt eklerken gönderiliyor - bir düzenlemede tekrar
      // gönderilirse aynı tutar ikinci kez cariye işlenmiş olurdu.
      ...(editingId ? {} : { cariId: form.cariId || null, postToCari: form.postToCari }),
    };
    try {
      if (editingId) {
        await editPurchase(editingId, fields);
        setEditingId(null);
        setForm({ ...EMPTY_PURCHASE, supplierId: form.supplierId, tarih: form.tarih });
      } else {
        await addPurchase(fields);
        setForm({ ...EMPTY_PURCHASE, supplierId: form.supplierId, tarih: form.tarih });
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
          <Wallet size={18} />
          <div>
            <div className="stat-value">{fmtCurrency(stats.total)}</div>
            <div className="stat-label">Toplam Satın Alma</div>
          </div>
        </div>
        <div className="stat-card">
          <Clock size={18} />
          <div>
            <div className="stat-value">{fmtCurrency(stats.pending)}</div>
            <div className="stat-label">Bekleyen Ödeme</div>
          </div>
        </div>
        <div className="stat-card">
          <Users size={18} />
          <div>
            <div className="stat-value">{stats.supplierCount}</div>
            <div className="stat-label">Tedarikçi</div>
          </div>
        </div>
      </div>

      <form className="product-form" onSubmit={handlePurchaseSubmit}>
        <div className="field">
          <label htmlFor="pu-tedarikci">Tedarikçi</label>
          <select
            id="pu-tedarikci"
            value={form.supplierId}
            onChange={(e) => updateField("supplierId", e.target.value)}
          >
            <option value="">— Seçilmedi —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.ad}
              </option>
            ))}
          </select>
          {suppliers.length === 0 && (
            <p className="field-hint">Henüz tedarikçi yok - "Tedarikçiler" sekmesinden ekleyebilirsiniz.</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="pu-urun">Ürün Adı *</label>
          <input
            id="pu-urun"
            type="text"
            value={form.urunAdi}
            onChange={(e) => updateField("urunAdi", e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="pu-barkod">Barkod</label>
          <input
            id="pu-barkod"
            type="text"
            value={form.barkod}
            onChange={(e) => updateField("barkod", e.target.value)}
            list="pu-barkod-list"
          />
          <datalist id="pu-barkod-list">
            {catalog.map((c) => (
              <option key={c.id} value={c.barkod}>
                {c.urunAdi}
              </option>
            ))}
          </datalist>
        </div>

        <div className="field">
          <label htmlFor="pu-miktar">Miktar</label>
          <input
            id="pu-miktar"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.miktar}
            onChange={(e) => updateField("miktar", e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="pu-birim">Birim</label>
          <input
            id="pu-birim"
            type="text"
            placeholder="adet / kg / teneke..."
            value={form.birim}
            onChange={(e) => updateField("birim", e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="pu-birimfiyat">Birim Fiyat (₺)</label>
          <input
            id="pu-birimfiyat"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.birimFiyat}
            onChange={(e) => updateField("birimFiyat", e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="pu-toplam">Toplam Tutar (₺)</label>
          <input
            id="pu-toplam"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.toplamTutar}
            onChange={(e) => updateField("toplamTutar", e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="pu-vergi">Vergi Oranı (%, opsiyonel)</label>
          <input
            id="pu-vergi"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="örn. 20 (KDV)"
            value={form.vergiOrani}
            onChange={(e) => updateField("vergiOrani", e.target.value)}
          />
          <p className="field-hint">Toplam tutarın vergi dahil olduğu varsayılır - Muhasebe'de ödenen KDV buradan ayrıştırılır.</p>
        </div>

        <div className="field">
          <label htmlFor="pu-durum">Ödeme Durumu</label>
          <select id="pu-durum" value={form.odemeDurumu} onChange={(e) => updateField("odemeDurumu", e.target.value)}>
            <option value="beklemede">Beklemede</option>
            <option value="kismi">Kısmi</option>
            <option value="odendi">Ödendi</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="pu-tarih">Tarih</label>
          <DatePicker id="pu-tarih" value={form.tarih} onChange={(v) => updateField("tarih", v)} />
        </div>

        <div className="field field-wide">
          <label htmlFor="pu-not">Not</label>
          <input id="pu-not" type="text" value={form.notMetni} onChange={(e) => updateField("notMetni", e.target.value)} />
        </div>

        {!editingId && (
          <>
            <div className="field">
              <label htmlFor="pu-cari">Cari Hesap'tan seç (opsiyonel)</label>
              <select id="pu-cari" value={form.cariId} onChange={(e) => updateField("cariId", e.target.value)}>
                <option value="">— Seçilmedi —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.ad}
                  </option>
                ))}
              </select>
            </div>

            {form.cariId && (
              <label className="checkbox-inline field-wide">
                <input
                  type="checkbox"
                  checked={form.postToCari}
                  onChange={(e) => updateField("postToCari", e.target.checked)}
                />
                Tutarı bu cari hesaba alacak olarak işle (biz bu tedarikçiye borçlanırız)
              </label>
            )}
          </>
        )}

        {submitError && <p className="form-error">{submitError}</p>}

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={submitting}>
            {editingId ? <Pencil size={16} /> : <Plus size={16} />}
            {submitting ? "Kaydediliyor…" : editingId ? "Güncelle" : "Satın Alma Ekle"}
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
            placeholder="Ürün, barkod ya da tedarikçide ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="empty-state">Yükleniyor…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">
            {purchases.length === 0 ? "Henüz satın alma kaydı yok." : "Aramayla eşleşen kayıt yok."}
          </p>
        ) : (
          <div className="scan-table-scroll">
            <table className="scan-table">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th>Tedarikçi</th>
                  <th>Miktar</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g.key}>
                    <tr className="date-divider">
                      <td colSpan={7}>{g.label}</td>
                    </tr>
                    {g.items.map((p) => (
                      <tr key={p.id} className={editingId === p.id ? "editing-row" : ""}>
                        <td>{p.urunAdi}</td>
                        <td className="muted">{p.tedarikciAdi || "-"}</td>
                        <td className="muted">{p.miktar != null ? `${p.miktar} ${p.birim || ""}`.trim() : "-"}</td>
                        <td>{fmtCurrency(p.toplamTutar)}</td>
                        <td>
                          <button
                            className={`status-badge status-${p.odemeDurumu}`}
                            onClick={() => cycleStatus(p.id, STATUS_NEXT[p.odemeDurumu] || "beklemede")}
                            title="Durumu değiştirmek için tıklayın"
                          >
                            {STATUS_LABEL[p.odemeDurumu] || p.odemeDurumu}
                          </button>
                        </td>
                        <td className="muted">{trDate(p.tarih)}</td>
                        <td className="row-actions">
                          <button className="icon-btn" onClick={() => startEdit(p)} aria-label="Düzenle" title="Düzenle">
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-btn danger"
                            onClick={() => removePurchase(p.id)}
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
