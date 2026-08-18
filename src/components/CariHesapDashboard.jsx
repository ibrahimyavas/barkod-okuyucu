import { useCallback, useMemo, useState } from "react";
import { Landmark, Plus, Trash2, Search, ArrowLeft } from "lucide-react";
import { useCariAccounts } from "../hooks/useCariAccounts.js";
import { useCariMovements } from "../hooks/useCariMovements.js";
import { todayISO, trDate, fmtCurrency } from "../lib/format.js";

const EMPTY_ACCOUNT = { ad: "", tur: "musteri", telefon: "", adres: "" };
const EMPTY_MOVEMENT = { tur: "borc", tutar: "", aciklama: "", tarih: todayISO() };

const TYPE_LABEL = { musteri: "Müşteri", tedarikci: "Tedarikçi", diger: "Diğer" };

// bakiye = Σborç - Σalacak. Pozitif: cari bize borçlu. Negatif: biz cariye
// borçluyuz. (Standart cari hesap ekstresi mantığı - bkz. migration notu.)
function balanceLabel(bakiye) {
  const v = Number(bakiye) || 0;
  if (v > 0.004) return { text: `${fmtCurrency(v)} alacaklı`, cls: "balance-positive" };
  if (v < -0.004) return { text: `${fmtCurrency(Math.abs(v))} borçlu`, cls: "balance-negative" };
  return { text: "Hesap kapalı", cls: "balance-zero" };
}

export default function CariHesapDashboard() {
  const { accounts, loading, error, addAccount, removeAccount, reload } = useCariAccounts();
  const [form, setForm] = useState(EMPTY_ACCOUNT);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const onMovementsChanged = useCallback(() => reload(), [reload]);
  const {
    movements,
    loading: movementsLoading,
    error: movementsError,
    addMovement,
    removeMovement,
  } = useCariMovements(selectedId, onMovementsChanged);

  const [moveForm, setMoveForm] = useState(EMPTY_MOVEMENT);
  const [moveError, setMoveError] = useState(null);
  const [moveSubmitting, setMoveSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => [a.ad, a.telefon].some((v) => v?.toLowerCase().includes(q)));
  }, [accounts, query]);

  const stats = useMemo(() => {
    let alacak = 0;
    let borc = 0;
    for (const a of accounts) {
      const v = Number(a.bakiye) || 0;
      if (v > 0) alacak += v;
      else borc += -v;
    }
    return { alacak, borc, count: accounts.length };
  }, [accounts]);

  const selected = accounts.find((a) => a.id === selectedId) || null;

  async function handleAccountSubmit(e) {
    e.preventDefault();
    const ad = form.ad.trim();
    if (!ad) {
      setFormError("Cari adı zorunlu.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await addAccount({ ...form, ad });
      setForm(EMPTY_ACCOUNT);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMovementSubmit(e) {
    e.preventDefault();
    const tutar = Number(moveForm.tutar);
    if (!Number.isFinite(tutar) || tutar <= 0) {
      setMoveError("Tutar sıfırdan büyük olmalı.");
      return;
    }
    setMoveSubmitting(true);
    setMoveError(null);
    try {
      await addMovement({ ...moveForm, tutar });
      setMoveForm({ ...EMPTY_MOVEMENT, tarih: moveForm.tarih });
    } catch (err) {
      setMoveError(err.message);
    } finally {
      setMoveSubmitting(false);
    }
  }

  if (selected) {
    const bal = balanceLabel(selected.bakiye);
    return (
      <div className="dashboard">
        <button type="button" className="icon-btn labeled" onClick={() => setSelectedId(null)}>
          <ArrowLeft size={16} />
          Cari Listesine Dön
        </button>

        <div className="stat-cards">
          <div className="stat-card">
            <Landmark size={18} />
            <div>
              <div className={`stat-value ${bal.cls}`}>{bal.text}</div>
              <div className="stat-label">
                {selected.ad} · {TYPE_LABEL[selected.tur] || selected.tur}
              </div>
            </div>
          </div>
        </div>

        <form className="product-form" onSubmit={handleMovementSubmit}>
          <div className="field">
            <label htmlFor="mv-tur">Hareket Türü</label>
            <select id="mv-tur" value={moveForm.tur} onChange={(e) => setMoveForm((f) => ({ ...f, tur: e.target.value }))}>
              <option value="borc">Borç (bakiye + yönünde)</option>
              <option value="alacak">Alacak / Tahsilat (bakiye − yönünde)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="mv-tutar">Tutar (₺)</label>
            <input
              id="mv-tutar"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={moveForm.tutar}
              onChange={(e) => setMoveForm((f) => ({ ...f, tutar: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="mv-tarih">Tarih</label>
            <input
              id="mv-tarih"
              type="date"
              value={moveForm.tarih}
              onChange={(e) => setMoveForm((f) => ({ ...f, tarih: e.target.value }))}
            />
          </div>
          <div className="field field-wide">
            <label htmlFor="mv-aciklama">Açıklama</label>
            <input
              id="mv-aciklama"
              type="text"
              value={moveForm.aciklama}
              onChange={(e) => setMoveForm((f) => ({ ...f, aciklama: e.target.value }))}
            />
          </div>
          {moveError && <p className="form-error">{moveError}</p>}
          <button type="submit" className="submit-btn" disabled={moveSubmitting}>
            <Plus size={16} />
            {moveSubmitting ? "Ekleniyor…" : "Hareket Ekle"}
          </button>
        </form>

        <div className="scan-table-wrap">
          {movementsError && <p className="form-error">{movementsError}</p>}
          {movementsLoading ? (
            <p className="empty-state">Yükleniyor…</p>
          ) : movements.length === 0 ? (
            <p className="empty-state">Henüz hareket yok.</p>
          ) : (
            <div className="scan-table-scroll">
              <table className="scan-table">
                <thead>
                  <tr>
                    <th>Tür</th>
                    <th>Tutar</th>
                    <th>Açıklama</th>
                    <th>Tarih</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <span className={`status-badge ${m.tur === "borc" ? "status-beklemede" : "status-odendi"}`}>
                          {m.tur === "borc" ? "Borç" : "Alacak"}
                        </span>
                      </td>
                      <td>{fmtCurrency(m.tutar)}</td>
                      <td className="muted">{m.aciklama || "-"}</td>
                      <td className="muted">{trDate(m.tarih)}</td>
                      <td>
                        <button
                          className="icon-btn danger"
                          onClick={() => removeMovement(m.id)}
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

  return (
    <div className="dashboard">
      <div className="stat-cards">
        <div className="stat-card">
          <Landmark size={18} />
          <div>
            <div className="stat-value balance-positive">{fmtCurrency(stats.alacak)}</div>
            <div className="stat-label">Toplam Alacağımız</div>
          </div>
        </div>
        <div className="stat-card">
          <Landmark size={18} />
          <div>
            <div className="stat-value balance-negative">{fmtCurrency(stats.borc)}</div>
            <div className="stat-label">Toplam Borcumuz</div>
          </div>
        </div>
        <div className="stat-card">
          <Landmark size={18} />
          <div>
            <div className="stat-value">{stats.count}</div>
            <div className="stat-label">Cari Hesap</div>
          </div>
        </div>
      </div>

      <form className="product-form" onSubmit={handleAccountSubmit}>
        <div className="field">
          <label htmlFor="ca-ad">Cari Adı *</label>
          <input id="ca-ad" type="text" value={form.ad} onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))} required />
        </div>
        <div className="field">
          <label htmlFor="ca-tur">Tür</label>
          <select id="ca-tur" value={form.tur} onChange={(e) => setForm((f) => ({ ...f, tur: e.target.value }))}>
            <option value="musteri">Müşteri</option>
            <option value="tedarikci">Tedarikçi</option>
            <option value="diger">Diğer</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="ca-telefon">Telefon</label>
          <input
            id="ca-telefon"
            type="text"
            value={form.telefon}
            onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="ca-adres">Adres</label>
          <input id="ca-adres" type="text" value={form.adres} onChange={(e) => setForm((f) => ({ ...f, adres: e.target.value }))} />
        </div>
        {formError && <p className="form-error">{formError}</p>}
        <button type="submit" className="submit-btn" disabled={submitting}>
          <Plus size={16} />
          {submitting ? "Ekleniyor…" : "Cari Ekle"}
        </button>
      </form>

      <div className="scan-table-wrap">
        <div className="scan-search">
          <Search size={16} />
          <input type="text" placeholder="Cari ara…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="empty-state">Yükleniyor…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">{accounts.length === 0 ? "Henüz cari hesap yok." : "Aramayla eşleşen cari yok."}</p>
        ) : (
          <div className="scan-table-scroll">
            <table className="scan-table">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Tür</th>
                  <th>Bakiye</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const bal = balanceLabel(a.bakiye);
                  return (
                    <tr key={a.id} className="clickable-row" onClick={() => setSelectedId(a.id)}>
                      <td>{a.ad}</td>
                      <td className="muted">{TYPE_LABEL[a.tur] || a.tur}</td>
                      <td className={bal.cls}>{bal.text}</td>
                      <td>
                        <button
                          className="icon-btn danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAccount(a.id);
                          }}
                          aria-label="Sil"
                          title="Sil"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
