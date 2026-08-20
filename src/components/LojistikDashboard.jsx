import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Truck, PackageCheck, AlertTriangle, Plus, Pencil, Trash2, X, Search, ScanBarcode, QrCode, Check } from "lucide-react";
import { useSevkiyatlar } from "../hooks/useSevkiyatlar.js";
import { useCariAccounts } from "../hooks/useCariAccounts.js";
import { useCameraScanner } from "../hooks/useCameraScanner.js";
import { QR_ONLY_FORMATS, resolveQrOnlyDetector } from "../lib/barcodeDetector.js";
import { parseRoutePayload, parseRouteRef } from "../lib/qrPayload.js";
import { fetchSevkiyat } from "../lib/api.js";
import { todayISO, trDate, isPastDate, groupByDate } from "../lib/format.js";
import { findCatalogEntry } from "../lib/catalog.js";
import DatePicker from "./DatePicker.jsx";
import CameraPanel from "./CameraPanel.jsx";
import Modal from "./Modal.jsx";

// Etiket Bas'ta bastığımız güzergah QR'ları (bkz. lib/qrPayload.js) burada
// tekrar okunuyor - kırpma bölgesi ScannerView'daki QR moduyla aynı.
const QR_CROP_REGION = { widthPct: 0.8, heightPct: 0.8 };

const EMPTY_FORM = {
  yon: "giden",
  cariId: "",
  tarafAdi: "",
  barkod: "",
  urunAdi: "",
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
    barkod: s.barkod || "",
    urunAdi: s.urunAdi || "",
    aracPlakasi: s.aracPlakasi || "",
    surucu: s.surucu || "",
    cikisKonumu: s.cikisKonumu || "",
    varisKonumu: s.varisKonumu || "",
    planlananTarih: s.planlananTarih || todayISO(),
    durum: s.durum || "planlandi",
    notMetni: s.notMetni || "",
  };
}

export default function LojistikDashboard({ catalog = [], suppliers = [], customers = [] }) {
  const { sevkiyatlar, loading, error, addSevkiyat, updateOne, removeSevkiyat } = useSevkiyatlar();
  const { accounts } = useCariAccounts();

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [query, setQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lastHit, setLastHit] = useState(null);
  // "Canlı" (ID referanslı) bir QR okutulunca açılan bilgi kartı - bkz.
  // lib/qrPayload.js buildRouteRef/parseRouteRef. liveRecord her okutmada
  // sunucudan TAZE çekiliyor, yerel sevkiyatlar listesine güvenmiyoruz.
  const [liveRef, setLiveRef] = useState(null);
  const [liveRecord, setLiveRecord] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState(null);
  const [liveVaris, setLiveVaris] = useState("");

  function closeLiveCard() {
    setLiveRef(null);
    setLiveRecord(null);
    setLiveError(null);
  }

  async function handleLiveDurumChange(durum) {
    if (!liveRecord) return;
    await updateOne(liveRecord.id, { durum });
    setLiveRecord((r) => (r ? { ...r, durum } : r));
  }

  async function handleLiveVarisSave() {
    if (!liveRecord) return;
    await updateOne(liveRecord.id, { varisKonumu: liveVaris });
    setLiveRecord((r) => (r ? { ...r, varisKonumu: liveVaris } : r));
  }

  // Etiket Bas'ta bastığımız güzergah QR'ını okutunca formu tek seferde
  // doldurur: barkod/ürün adı + nereden/nereye -> çıkış/varış konumu.
  // Bir "canlı referans" QR'ıysa (buildRouteRef ile basılmış, bkz.
  // LabelPrintDashboard) formu doldurmak yerine o sevkiyatın GÜNCEL halini
  // sunucudan çekip bir bilgi kartı açıyoruz. Bizim formatımıza uymayan bir
  // kod okunursa ham değeri düz barkod gibi ele alıyoruz - yukarıdaki
  // katalog eşleşmesi zaten ürün adını doldurur. Kamera açık kalıyor
  // (otomatik kapanmıyor) - kullanıcı "Kapat"a basana kadar art arda
  // tarayabilir.
  const handleQrDetect = useCallback((code) => {
    setLastHit({ code, ts: Date.now() });

    const ref = parseRouteRef(code);
    if (ref) {
      setLiveRef(ref);
      setLiveRecord(null);
      if (ref.tur !== "sevk") {
        setLiveError("Bu QR bir İç Lojistik transferine ait - İç Lojistik ekranından okutun.");
        setLiveLoading(false);
        return;
      }
      setLiveError(null);
      setLiveLoading(true);
      fetchSevkiyat(ref.id)
        .then((s) => {
          setLiveRecord(s);
          setLiveVaris(s.varisKonumu || "");
        })
        .catch((err) => setLiveError(err.message))
        .finally(() => setLiveLoading(false));
      return;
    }

    const parsed = parseRoutePayload(code);
    setForm((f) => ({
      ...f,
      barkod: parsed?.barkod || code,
      urunAdi: parsed?.urunAdi || f.urunAdi,
      cikisKonumu: parsed?.nereden || f.cikisKonumu,
      varisKonumu: parsed?.nereye || f.varisKonumu,
    }));
  }, []);

  const camera = useCameraScanner({
    enabled: scannerOpen,
    formats: QR_ONLY_FORMATS,
    resolveDetector: resolveQrOnlyDetector,
    cropRegion: QR_CROP_REGION,
    onDetect: handleQrDetect,
  });

  function pickCari(id) {
    const acc = accounts.find((a) => a.id === id);
    setForm((f) => ({ ...f, cariId: id, tarafAdi: acc?.ad || f.tarafAdi }));
  }

  // "Giden" (müşteriye) -> Müşteriler'den, "gelen" (tedarikçiden) ->
  // Tedarikçiler'den seçim - yön'e göre otomatik olarak doğru liste
  // sunulur. Cari Hesap seçici de ayrıca duruyor (borç/alacak takibi için).
  function pickMusteri(ad) {
    setForm((f) => ({ ...f, tarafAdi: ad || f.tarafAdi }));
  }

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Barkod, Ürün Listesi kataloğundaki bir kayıtla eşleşirse ürün adını
  // otomatik dolduruyoruz - bkz. lib/catalog.js.
  useEffect(() => {
    if (editingId) return;
    const match = findCatalogEntry(catalog, form.barkod);
    if (!match) return;
    setForm((f) => ({ ...f, urunAdi: match.urunAdi || f.urunAdi }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.barkod, editingId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sevkiyatlar;
    return sevkiyatlar.filter((s) =>
      [s.tarafAdi, s.aracPlakasi, s.surucu, s.urunAdi, s.barkod].some((v) => v?.toLowerCase().includes(q))
    );
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

      <div className="qr-scan-toggle-row">
        <button
          type="button"
          className={`icon-btn labeled ${scannerOpen ? "active" : ""}`}
          onClick={() => setScannerOpen((v) => !v)}
        >
          <QrCode size={16} />
          {scannerOpen ? "Taramayı Kapat" : "QR ile Sevkiyat Doldur"}
        </button>
      </div>

      {scannerOpen && (
        <CameraPanel
          camera={camera}
          cameraOn={scannerOpen}
          onToggleCamera={() => setScannerOpen(false)}
          scanMode="qr"
          lastHit={lastHit}
        />
      )}

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

        {form.yon === "giden" ? (
          <div className="field">
            <label htmlFor="lj-musteri">Müşteri'den seç (opsiyonel)</label>
            <select id="lj-musteri" defaultValue="" onChange={(e) => pickMusteri(e.target.value)}>
              <option value="">— Elle gir —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.ad}>
                  {c.ad}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="lj-tedarikci">Tedarikçi'den seç (opsiyonel)</label>
            <select id="lj-tedarikci" defaultValue="" onChange={(e) => pickMusteri(e.target.value)}>
              <option value="">— Elle gir —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.ad}>
                  {s.ad}
                </option>
              ))}
            </select>
          </div>
        )}

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
          <label htmlFor="lj-barkod">
            <ScanBarcode size={14} /> Barkod
          </label>
          <input
            id="lj-barkod"
            type="text"
            value={form.barkod}
            onChange={(e) => updateField("barkod", e.target.value)}
            placeholder="Taranan kod ya da elle girin"
            list="lj-barkod-list"
          />
          <datalist id="lj-barkod-list">
            {catalog.map((c) => (
              <option key={c.id} value={c.barkod}>
                {c.urunAdi}
              </option>
            ))}
          </datalist>
        </div>

        <div className="field">
          <label htmlFor="lj-urun">Ürün Adı</label>
          <input id="lj-urun" type="text" value={form.urunAdi} onChange={(e) => updateField("urunAdi", e.target.value)} />
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
          <DatePicker id="lj-tarih" value={form.planlananTarih} onChange={(v) => updateField("planlananTarih", v)} />
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
                  <th>Ürün</th>
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
                      <td colSpan={8}>{g.label}</td>
                    </tr>
                    {g.items.map((s) => (
                      <tr key={s.id} className={editingId === s.id ? "editing-row" : ""}>
                        <td className="muted">{s.yon === "giden" ? "Giden" : "Gelen"}</td>
                        <td>{s.tarafAdi}</td>
                        <td className="muted">{s.urunAdi || "-"}</td>
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

      {liveRef && (
        <Modal title="Sevkiyat - Canlı Bilgi" onClose={closeLiveCard}>
          {liveLoading ? (
            <p className="empty-state">Yükleniyor…</p>
          ) : liveError ? (
            <p className="form-error">{liveError}</p>
          ) : liveRecord ? (
            <>
              <dl className="live-card-fields">
                <div className="live-card-row">
                  <dt>Taraf</dt>
                  <dd>{liveRecord.tarafAdi}</dd>
                </div>
                <div className="live-card-row">
                  <dt>Ürün</dt>
                  <dd>{liveRecord.urunAdi || "-"}</dd>
                </div>
                <div className="live-card-row">
                  <dt>Plaka / Sürücü</dt>
                  <dd>
                    {liveRecord.aracPlakasi || "-"}
                    {liveRecord.surucu ? ` · ${liveRecord.surucu}` : ""}
                  </dd>
                </div>
                <div className="live-card-row">
                  <dt>Çıkış Konumu</dt>
                  <dd>{liveRecord.cikisKonumu || "-"}</dd>
                </div>
                <div className="live-card-row">
                  <dt>Planlanan Tarih</dt>
                  <dd>{trDate(liveRecord.planlananTarih)}</dd>
                </div>
                <div className="live-card-row">
                  <dt>Gerçekleşen Tarih</dt>
                  <dd>{trDate(liveRecord.gerceklesenTarih) || "-"}</dd>
                </div>
              </dl>

              <div className="field">
                <label htmlFor="lj-live-durum">Durum</label>
                <select
                  id="lj-live-durum"
                  className={`status-badge ${DURUM_BADGE_CLASS[liveRecord.durum]}`}
                  value={liveRecord.durum}
                  onChange={(e) => handleLiveDurumChange(e.target.value)}
                >
                  {DURUM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="lj-live-varis">Varış Konumu</label>
                <div className="live-card-location-edit">
                  <input
                    id="lj-live-varis"
                    type="text"
                    value={liveVaris}
                    onChange={(e) => setLiveVaris(e.target.value)}
                  />
                  <button type="button" className="icon-btn" onClick={handleLiveVarisSave} title="Kaydet">
                    <Check size={15} />
                  </button>
                </div>
              </div>

              <p className="dashboard-hint">
                Bu bilgi canlıdır - kaydı güncelledikçe (burada ya da tablodan) aynı etiketi tekrar okutunca güncel
                hali görünür.
              </p>
            </>
          ) : null}
        </Modal>
      )}
    </div>
  );
}
