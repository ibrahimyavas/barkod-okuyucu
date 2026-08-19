import { useMemo, useState } from "react";
import { Plus, Trash2, Printer, ChevronDown, Settings } from "lucide-react";
import { useFaturaAyarlari } from "../hooks/useFaturaAyarlari.js";
import { useFaturalar } from "../hooks/useFaturalar.js";
import { useCariAccounts } from "../hooks/useCariAccounts.js";
import { useProducts } from "../hooks/useProducts.js";
import { todayISO, trDate, fmtCurrency } from "../lib/format.js";
import FaturaDocument from "./FaturaDocument.jsx";
import DatePicker from "./DatePicker.jsx";

const EMPTY_FORM = {
  tur: "fatura",
  cariId: "",
  muhatapAdi: "",
  muhatapAdres: "",
  muhatapTelefon: "",
  tarih: todayISO(),
  kdvOrani: "",
  notMetni: "",
  postToCari: false,
  kalemler: [],
};

const EMPTY_ITEM = { urunAdi: "", miktar: "", birim: "", birimFiyat: "" };

export default function FaturaDashboard() {
  const { settings, saveSettings } = useFaturaAyarlari();
  const { faturalar, loading, error, addFatura, removeFatura } = useFaturalar();
  const { accounts } = useCariAccounts();
  const { products } = useProducts();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState(null); // lazily seeded from `settings` on open
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [item, setItem] = useState(EMPTY_ITEM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);

  function openSettings() {
    setSettingsForm(settings || {});
    setSettingsOpen((v) => !v);
  }

  async function handleSettingsSave(e) {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      await saveSettings(settingsForm);
      setSettingsOpen(false);
    } finally {
      setSettingsSaving(false);
    }
  }

  function pickCari(id) {
    const acc = accounts.find((a) => a.id === id);
    setForm((f) => ({
      ...f,
      cariId: id,
      muhatapAdi: acc?.ad || f.muhatapAdi,
      muhatapAdres: acc?.adres || "",
      muhatapTelefon: acc?.telefon || "",
    }));
  }

  function pickProduct(id) {
    const p = products.find((pr) => pr.id === id);
    if (p) {
      setItem((it) => ({
        ...it,
        urunAdi: p.urunAdi,
        birim: p.birim || "",
        birimFiyat: p.maliyet != null ? String(p.maliyet) : it.birimFiyat,
      }));
    }
  }

  function addItem(e) {
    e.preventDefault();
    const urunAdi = item.urunAdi.trim();
    const miktar = Number(item.miktar);
    if (!urunAdi || !Number.isFinite(miktar) || miktar <= 0) return;
    const birimFiyat = item.birimFiyat === "" ? 0 : Number(item.birimFiyat) || 0;
    setForm((f) => ({
      ...f,
      kalemler: [
        ...f.kalemler,
        { urunAdi, miktar, birim: item.birim.trim(), birimFiyat, tutar: Math.round(miktar * birimFiyat * 100) / 100 },
      ],
    }));
    setItem(EMPTY_ITEM);
  }

  function removeItem(idx) {
    setForm((f) => ({ ...f, kalemler: f.kalemler.filter((_, i) => i !== idx) }));
  }

  const totals = useMemo(() => {
    const araToplam = form.kalemler.reduce((sum, k) => sum + k.tutar, 0);
    const kdvOrani = form.tur === "fatura" && form.kdvOrani !== "" ? Number(form.kdvOrani) || 0 : 0;
    const kdvTutari = (araToplam * kdvOrani) / 100;
    return { araToplam, kdvTutari, genelToplam: araToplam + kdvTutari };
  }, [form.kalemler, form.kdvOrani, form.tur]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.muhatapAdi.trim()) {
      setSubmitError("Muhatap adı zorunlu.");
      return;
    }
    if (form.kalemler.length === 0) {
      setSubmitError("En az bir kalem eklemelisiniz.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await addFatura(form);
      setActiveDoc({ ...form, ...result });
      setForm({ ...EMPTY_FORM, tarih: form.tarih });
      // Let the print-area re-render with the new doc before the dialog opens.
      requestAnimationFrame(() => window.print());
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function reprint(record) {
    setActiveDoc(record);
    requestAnimationFrame(() => window.print());
  }

  return (
    <div className="dashboard">
      <div className="collapsible">
        <button type="button" className="collapsible-header" onClick={openSettings}>
          <span>
            <Settings size={14} /> Firma Bilgileri
          </span>
          <ChevronDown size={16} className={settingsOpen ? "chevron-open" : ""} />
        </button>

        {settingsOpen && settingsForm && (
          <div className="collapsible-body">
            <form className="product-form" onSubmit={handleSettingsSave}>
              <div className="field">
                <label htmlFor="fa-firma-adi">Firma Adı</label>
                <input
                  id="fa-firma-adi"
                  type="text"
                  value={settingsForm.firmaAdi || ""}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, firmaAdi: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="fa-firma-adres">Adres</label>
                <input
                  id="fa-firma-adres"
                  type="text"
                  value={settingsForm.firmaAdres || ""}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, firmaAdres: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="fa-firma-tel">Telefon</label>
                <input
                  id="fa-firma-tel"
                  type="text"
                  value={settingsForm.firmaTelefon || ""}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, firmaTelefon: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="fa-firma-vergi">Vergi No</label>
                <input
                  id="fa-firma-vergi"
                  type="text"
                  value={settingsForm.firmaVergiNo || ""}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, firmaVergiNo: e.target.value }))}
                />
              </div>
              <button type="submit" className="submit-btn" disabled={settingsSaving}>
                {settingsSaving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </form>
          </div>
        )}
      </div>

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="fd-tur">Tür</label>
          <select id="fd-tur" value={form.tur} onChange={(e) => setForm((f) => ({ ...f, tur: e.target.value }))}>
            <option value="fatura">Fatura</option>
            <option value="irsaliye">İrsaliye</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="fd-tarih">Tarih</label>
          <DatePicker id="fd-tarih" value={form.tarih} onChange={(v) => setForm((f) => ({ ...f, tarih: v }))} />
        </div>

        <div className="field field-wide">
          <label htmlFor="fd-cari">Cari Hesap'tan seç (opsiyonel)</label>
          <select id="fd-cari" value={form.cariId} onChange={(e) => pickCari(e.target.value)}>
            <option value="">— Elle gir —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.ad}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="fd-muhatap-ad">Muhatap Adı *</label>
          <input
            id="fd-muhatap-ad"
            type="text"
            value={form.muhatapAdi}
            onChange={(e) => setForm((f) => ({ ...f, muhatapAdi: e.target.value }))}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="fd-muhatap-adres">Muhatap Adres</label>
          <input
            id="fd-muhatap-adres"
            type="text"
            value={form.muhatapAdres}
            onChange={(e) => setForm((f) => ({ ...f, muhatapAdres: e.target.value }))}
          />
        </div>

        <div className="field">
          <label htmlFor="fd-muhatap-tel">Muhatap Telefon</label>
          <input
            id="fd-muhatap-tel"
            type="text"
            value={form.muhatapTelefon}
            onChange={(e) => setForm((f) => ({ ...f, muhatapTelefon: e.target.value }))}
          />
        </div>

        {form.tur === "fatura" && (
          <div className="field">
            <label htmlFor="fd-kdv">KDV Oranı (%)</label>
            <input
              id="fd-kdv"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="örn. 20"
              value={form.kdvOrani}
              onChange={(e) => setForm((f) => ({ ...f, kdvOrani: e.target.value }))}
            />
          </div>
        )}

        {form.tur === "fatura" && form.cariId && (
          <label className="checkbox-inline field-wide">
            <input
              type="checkbox"
              checked={form.postToCari}
              onChange={(e) => setForm((f) => ({ ...f, postToCari: e.target.checked }))}
            />
            Tutarı bu cari hesaba borç olarak işle
          </label>
        )}

        <div className="field field-wide">
          <label>Kalemler</label>
          <div className="item-entry-row">
            <select
              className="item-entry-picker"
              onChange={(e) => pickProduct(e.target.value)}
              defaultValue=""
            >
              <option value="">Ürün Girişi'nden seç…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.urunAdi}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Ürün adı"
              value={item.urunAdi}
              onChange={(e) => setItem((it) => ({ ...it, urunAdi: e.target.value }))}
            />
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="Miktar"
              value={item.miktar}
              onChange={(e) => setItem((it) => ({ ...it, miktar: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Birim"
              value={item.birim}
              onChange={(e) => setItem((it) => ({ ...it, birim: e.target.value }))}
            />
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="Birim fiyat"
              value={item.birimFiyat}
              onChange={(e) => setItem((it) => ({ ...it, birimFiyat: e.target.value }))}
            />
            <button type="button" className="icon-btn" onClick={addItem} title="Kalemi ekle">
              <Plus size={16} />
            </button>
          </div>

          {form.kalemler.length > 0 && (
            <div className="scan-table-scroll">
              <table className="scan-table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Miktar</th>
                    <th>Birim Fiyat</th>
                    <th>Tutar</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {form.kalemler.map((k, i) => (
                    <tr key={i}>
                      <td>{k.urunAdi}</td>
                      <td className="muted">
                        {k.miktar} {k.birim}
                      </td>
                      <td className="muted">{fmtCurrency(k.birimFiyat)}</td>
                      <td>{fmtCurrency(k.tutar)}</td>
                      <td>
                        <button type="button" className="icon-btn danger" onClick={() => removeItem(i)} title="Sil">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {form.kalemler.length > 0 && form.tur === "fatura" && (
            <p className="muted totals-preview">
              Ara Toplam: {fmtCurrency(totals.araToplam)} · KDV: {fmtCurrency(totals.kdvTutari)} · Genel Toplam:{" "}
              <strong>{fmtCurrency(totals.genelToplam)}</strong>
            </p>
          )}
        </div>

        <div className="field field-wide">
          <label htmlFor="fd-not">Not</label>
          <input
            id="fd-not"
            type="text"
            value={form.notMetni}
            onChange={(e) => setForm((f) => ({ ...f, notMetni: e.target.value }))}
          />
        </div>

        {submitError && <p className="form-error">{submitError}</p>}

        <button type="submit" className="submit-btn" disabled={submitting}>
          <Printer size={16} />
          {submitting ? "Oluşturuluyor…" : "Oluştur ve Yazdır"}
        </button>
      </form>

      <div className="scan-table-wrap">
        {error && <p className="form-error">{error}</p>}
        {loading ? (
          <p className="empty-state">Yükleniyor…</p>
        ) : faturalar.length === 0 ? (
          <p className="empty-state">Henüz fatura/irsaliye kesilmedi.</p>
        ) : (
          <div className="scan-table-scroll">
            <table className="scan-table">
              <thead>
                <tr>
                  <th>Evrak No</th>
                  <th>Tür</th>
                  <th>Muhatap</th>
                  <th>Tarih</th>
                  <th>Tutar</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {faturalar.map((f) => (
                  <tr key={f.id}>
                    <td className="code-cell">{f.evrakNo}</td>
                    <td className="muted">{f.tur === "fatura" ? "Fatura" : "İrsaliye"}</td>
                    <td>{f.muhatapAdi}</td>
                    <td className="muted">{trDate(f.tarih)}</td>
                    <td>{f.tur === "fatura" ? fmtCurrency(f.genelToplam) : "-"}</td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => reprint(f)} aria-label="Yazdır" title="Yazdır">
                        <Printer size={15} />
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => removeFatura(f.id)}
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

      {/* Ekranda gizli - sadece yazdırma sırasında görünür (bkz. index.css @media print). */}
      <div className="print-area">
        {activeDoc && <FaturaDocument doc={activeDoc} settings={settings} />}
      </div>
    </div>
  );
}
