import { useMemo, useState } from "react";
import { Wallet, Clock, Users, Plus, Trash2, Search, ChevronDown } from "lucide-react";
import { useSuppliers } from "../hooks/useSuppliers.js";
import { usePurchases } from "../hooks/usePurchases.js";
import { todayISO, trDate, fmtCurrency } from "../lib/format.js";

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
};

const EMPTY_SUPPLIER = { ad: "", yetkili: "", telefon: "", adres: "" };

const STATUS_LABEL = { beklemede: "Beklemede", kismi: "Kısmi", odendi: "Ödendi" };
const STATUS_NEXT = { beklemede: "kismi", kismi: "odendi", odendi: "beklemede" };

export default function PurchasingDashboard() {
  const { suppliers, addSupplier, removeSupplier } = useSuppliers();
  const { purchases, loading, error, addPurchase, cycleStatus, removePurchase } = usePurchases();

  const [supplierPanelOpen, setSupplierPanelOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER);
  const [supplierError, setSupplierError] = useState(null);
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);

  const [form, setForm] = useState(EMPTY_PURCHASE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [query, setQuery] = useState("");

  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return purchases;
    return purchases.filter((p) =>
      [p.urunAdi, p.barkod, p.tedarikciAdi].some((v) => v?.toLowerCase().includes(q))
    );
  }, [purchases, query]);

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

  async function handleSupplierSubmit(e) {
    e.preventDefault();
    const ad = supplierForm.ad.trim();
    if (!ad) {
      setSupplierError("Tedarikçi adı zorunlu.");
      return;
    }
    setSupplierSubmitting(true);
    setSupplierError(null);
    try {
      const id = await addSupplier({ ...supplierForm, ad });
      setSupplierForm(EMPTY_SUPPLIER);
      setForm((f) => ({ ...f, supplierId: id }));
    } catch (err) {
      setSupplierError(err.message);
    } finally {
      setSupplierSubmitting(false);
    }
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
    try {
      const supplier = supplierById.get(form.supplierId);
      await addPurchase({
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
      });
      setForm({ ...EMPTY_PURCHASE, supplierId: form.supplierId, tarih: form.tarih });
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

      <div className="collapsible">
        <button
          type="button"
          className="collapsible-header"
          onClick={() => setSupplierPanelOpen((v) => !v)}
        >
          <span>
            <Users size={14} /> Tedarikçiler ({suppliers.length})
          </span>
          <ChevronDown size={16} className={supplierPanelOpen ? "chevron-open" : ""} />
        </button>

        {supplierPanelOpen && (
          <div className="collapsible-body">
            {suppliers.length > 0 && (
              <ul className="supplier-list">
                {suppliers.map((s) => (
                  <li key={s.id}>
                    <span>
                      <strong>{s.ad}</strong>
                      {s.yetkili ? ` · ${s.yetkili}` : ""}
                      {s.telefon ? ` · ${s.telefon}` : ""}
                    </span>
                    <button
                      className="icon-btn danger"
                      onClick={() => removeSupplier(s.id)}
                      aria-label="Tedarikçiyi sil"
                      title="Tedarikçiyi sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form className="product-form" onSubmit={handleSupplierSubmit}>
              <div className="field">
                <label htmlFor="sp-ad">Tedarikçi Adı *</label>
                <input
                  id="sp-ad"
                  type="text"
                  value={supplierForm.ad}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, ad: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="sp-yetkili">Yetkili</label>
                <input
                  id="sp-yetkili"
                  type="text"
                  value={supplierForm.yetkili}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, yetkili: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="sp-telefon">Telefon</label>
                <input
                  id="sp-telefon"
                  type="text"
                  value={supplierForm.telefon}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, telefon: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="sp-adres">Adres</label>
                <input
                  id="sp-adres"
                  type="text"
                  value={supplierForm.adres}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, adres: e.target.value }))}
                />
              </div>
              {supplierError && <p className="form-error">{supplierError}</p>}
              <button type="submit" className="submit-btn" disabled={supplierSubmitting}>
                <Plus size={16} />
                {supplierSubmitting ? "Ekleniyor…" : "Tedarikçi Ekle"}
              </button>
            </form>
          </div>
        )}
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
          <input id="pu-barkod" type="text" value={form.barkod} onChange={(e) => updateField("barkod", e.target.value)} />
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
          <label htmlFor="pu-durum">Ödeme Durumu</label>
          <select id="pu-durum" value={form.odemeDurumu} onChange={(e) => updateField("odemeDurumu", e.target.value)}>
            <option value="beklemede">Beklemede</option>
            <option value="kismi">Kısmi</option>
            <option value="odendi">Ödendi</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="pu-tarih">Tarih</label>
          <input id="pu-tarih" type="date" value={form.tarih} onChange={(e) => updateField("tarih", e.target.value)} />
        </div>

        <div className="field field-wide">
          <label htmlFor="pu-not">Not</label>
          <input id="pu-not" type="text" value={form.notMetni} onChange={(e) => updateField("notMetni", e.target.value)} />
        </div>

        {submitError && <p className="form-error">{submitError}</p>}

        <button type="submit" className="submit-btn" disabled={submitting}>
          <Plus size={16} />
          {submitting ? "Ekleniyor…" : "Satın Alma Ekle"}
        </button>
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
                {filtered.map((p) => (
                  <tr key={p.id}>
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
                    <td>
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
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
