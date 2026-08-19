import { useMemo, useState } from "react";
import { Tags, ScanBarcode, Plus, Pencil, Trash2, X, Search } from "lucide-react";
import { findCatalogEntry } from "../lib/catalog.js";
import { findLatestProductByBarcode, sonSatisFiyati } from "../lib/satis.js";
import { fmtCurrency } from "../lib/format.js";

const EMPTY_FORM = { barkod: "", satisFiyati: "" };

// Stok (Ürün Girişi) ile Satış (POS) arasındaki ara katman: burada yalnızca
// vergisiz taban satış fiyatını giriyorsunuz, vergi oranı Ürün Girişi'nden
// CANLI okunuyor (satis_fiyatlari tablosunda kopyalanmıyor - bkz.
// lib/satis.js) - "satış fiyatı + vergi = son satış fiyatı" burada
// hesaplanıp Satış (POS) ekranına o hâliyle yansıyor.
export default function SatisFiyatlariDashboard({ fiyatlar, loading, error, addFiyat, updateFiyat, removeFiyat, catalog, products }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [query, setQuery] = useState("");

  const catalogMatch = useMemo(() => findCatalogEntry(catalog, form.barkod), [catalog, form.barkod]);
  const productMatch = useMemo(() => findLatestProductByBarcode(products, form.barkod), [products, form.barkod]);
  const vergiOrani = productMatch?.vergiOrani || 0;
  const previewSonFiyat = form.satisFiyati !== "" ? sonSatisFiyati(form.satisFiyati, vergiOrani) : null;

  const barcodeConflict = useMemo(() => {
    const code = form.barkod.trim();
    if (!code || editingId) return null;
    return fiyatlar.find((f) => f.barkod === code) || null;
  }, [form.barkod, editingId, fiyatlar]);

  const rows = useMemo(() => {
    return fiyatlar.map((f) => {
      const urun = findLatestProductByBarcode(products, f.barkod);
      const katalog = findCatalogEntry(catalog, f.barkod);
      const vergi = urun?.vergiOrani || 0;
      return {
        ...f,
        urunAdi: urun?.urunAdi || katalog?.urunAdi || "",
        vergiOrani: vergi,
        sonFiyat: sonSatisFiyati(f.satisFiyati, vergi),
      };
    });
  }, [fiyatlar, products, catalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.urunAdi, r.barkod].some((v) => v?.toLowerCase().includes(q)));
  }, [rows, query]);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(f) {
    setEditingId(f.id);
    setForm({ barkod: f.barkod, satisFiyati: f.satisFiyati ?? "" });
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
    if (!barkod) {
      setSubmitError("Barkod zorunlu.");
      return;
    }
    const satisFiyati = Number(form.satisFiyati);
    if (!Number.isFinite(satisFiyati) || satisFiyati < 0) {
      setSubmitError("Satış fiyatı geçerli bir sayı olmalı.");
      return;
    }
    if (barcodeConflict) {
      setSubmitError("Bu barkod için satış fiyatı zaten tanımlı. Kopya oluşturmak yerine düzenleyin.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingId) {
        await updateFiyat(editingId, { barkod, satisFiyati });
        setEditingId(null);
      } else {
        await addFiyat({ barkod, satisFiyati });
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
          <Tags size={18} />
          <div>
            <div className="stat-value">{fiyatlar.length}</div>
            <div className="stat-label">Fiyatlandırılmış Ürün</div>
          </div>
        </div>
      </div>

      <p className="dashboard-hint">
        Vergisiz satış fiyatını girin - vergi oranı Ürün Girişi'nden otomatik gelir, son satış fiyatı (vergi dahil)
        buradan hesaplanıp Satış ekranına yansır.
      </p>

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="sf-barkod">
            <ScanBarcode size={14} /> Barkod *
          </label>
          <input
            id="sf-barkod"
            type="text"
            value={form.barkod}
            onChange={(e) => updateField("barkod", e.target.value)}
            placeholder="Taranan kod ya da elle girin"
            list="sf-barkod-list"
            disabled={!!editingId}
          />
          <datalist id="sf-barkod-list">
            {catalog.map((c) => (
              <option key={c.id} value={c.barkod}>
                {c.urunAdi}
              </option>
            ))}
          </datalist>
        </div>

        <div className="field">
          <label>Ürün Adı</label>
          <input type="text" value={catalogMatch?.urunAdi || productMatch?.urunAdi || ""} disabled placeholder="Barkod eşleşince gelir" />
        </div>

        <div className="field">
          <label htmlFor="sf-fiyat">Satış Fiyatı (₺, vergisiz) *</label>
          <input
            id="sf-fiyat"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.satisFiyati}
            onChange={(e) => updateField("satisFiyati", e.target.value)}
          />
        </div>

        <div className="field">
          <label>Vergi Oranı (%)</label>
          <input type="text" value={productMatch ? `${vergiOrani}` : "-"} disabled title="Ürün Girişi'nden gelir" />
        </div>

        <div className="field">
          <label>Son Satış Fiyatı (vergi dahil)</label>
          <input type="text" value={previewSonFiyat != null ? fmtCurrency(previewSonFiyat) : ""} disabled />
        </div>

        {form.barkod.trim() && !productMatch && (
          <p className="field-hint field-hint-warning field-wide">
            Bu barkod için Ürün Girişi'nde vergi oranı tanımlı değil - son fiyat şimdilik vergisiz fiyatla aynı
            hesaplanıyor.
          </p>
        )}

        {barcodeConflict && (
          <p className="field-hint field-hint-warning field-wide">
            Bu barkod için satış fiyatı zaten tanımlı.{" "}
            <button type="button" className="link-btn" onClick={() => startEdit(barcodeConflict)}>
              Düzenle
            </button>
          </p>
        )}

        {submitError && <p className="form-error">{submitError}</p>}

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={submitting}>
            {editingId ? <Pencil size={16} /> : <Plus size={16} />}
            {submitting ? "Kaydediliyor…" : editingId ? "Güncelle" : "Fiyat Ekle"}
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
            placeholder="Ürün ya da barkodda ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="empty-state">Yükleniyor…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">
            {fiyatlar.length === 0 ? "Henüz satış fiyatı tanımlanmadı." : "Aramayla eşleşen kayıt yok."}
          </p>
        ) : (
          <div className="scan-table-scroll">
            <table className="scan-table">
              <thead>
                <tr>
                  <th>Ürün Adı</th>
                  <th>Barkod</th>
                  <th>Satış Fiyatı</th>
                  <th>Vergi %</th>
                  <th>Son Satış Fiyatı</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className={editingId === r.id ? "editing-row" : ""}>
                    <td>{r.urunAdi || "-"}</td>
                    <td className="code-cell">{r.barkod}</td>
                    <td className="muted">{fmtCurrency(r.satisFiyati)}</td>
                    <td className="muted">%{r.vergiOrani}</td>
                    <td>
                      <strong>{fmtCurrency(r.sonFiyat)}</strong>
                    </td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => startEdit(r)} aria-label="Düzenle" title="Düzenle">
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => removeFiyat(r.id)}
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
