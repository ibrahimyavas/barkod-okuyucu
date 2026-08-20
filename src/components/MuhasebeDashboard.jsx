import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Scale, Receipt } from "lucide-react";
import { useFaturalar } from "../hooks/useFaturalar.js";
import { usePurchases } from "../hooks/usePurchases.js";
import { fmtCurrency, monthKeyOf, monthLabel, lastMonthKeys } from "../lib/format.js";

// Bir satın almanın vergisiz/vergi kısmını ayrıştırır - toplam_tutar vergi
// dahil kabul edilir (bkz. migrations/0012, worker/purchases.js), Satış
// fişlerindeki AYNI matematik (worker/fatura.js:createFatura).
function splitPurchaseTax(p) {
  const toplam = Number(p.toplamTutar) || 0;
  const oran = Number(p.vergiOrani) || 0;
  if (!oran) return { vergisiz: toplam, kdv: 0 };
  const vergisiz = Math.round((toplam / (1 + oran / 100)) * 100) / 100;
  return { vergisiz, kdv: Math.round((toplam - vergisiz) * 100) / 100 };
}

// Gelir/gider ve KDV özeti - mevcut Fatura (satış faturaları + POS fişleri)
// ve Satın Alma verilerinden hesaplanıyor, ayrı bir veri girişi yok. İrsaliye
// bilinçli olarak dışarıda tutuluyor - bir teslimat belgesi, fatura değil.
export default function MuhasebeDashboard() {
  const { faturalar, loading: faturalarLoading } = useFaturalar();
  const { purchases, loading: purchasesLoading } = usePurchases();
  const months = useMemo(() => lastMonthKeys(12), []);
  const [selectedMonth, setSelectedMonth] = useState("all");

  const gelirKayitlari = useMemo(
    () => faturalar.filter((f) => f.tur === "fatura" || f.tur === "fis"),
    [faturalar]
  );

  const filteredGelir = useMemo(() => {
    if (selectedMonth === "all") return gelirKayitlari;
    return gelirKayitlari.filter((f) => monthKeyOf(f.tarih) === selectedMonth);
  }, [gelirKayitlari, selectedMonth]);

  const filteredGider = useMemo(() => {
    if (selectedMonth === "all") return purchases;
    return purchases.filter((p) => monthKeyOf(p.tarih) === selectedMonth);
  }, [purchases, selectedMonth]);

  const stats = useMemo(() => {
    let gelirVergisiz = 0;
    let kdvTahsil = 0;
    for (const f of filteredGelir) {
      gelirVergisiz += Number(f.araToplam) || 0;
      kdvTahsil += Number(f.kdvTutari) || 0;
    }
    let giderVergisiz = 0;
    let kdvOdenen = 0;
    for (const p of filteredGider) {
      const { vergisiz, kdv } = splitPurchaseTax(p);
      giderVergisiz += vergisiz;
      kdvOdenen += kdv;
    }
    gelirVergisiz = Math.round(gelirVergisiz * 100) / 100;
    giderVergisiz = Math.round(giderVergisiz * 100) / 100;
    kdvTahsil = Math.round(kdvTahsil * 100) / 100;
    kdvOdenen = Math.round(kdvOdenen * 100) / 100;
    return {
      gelir: gelirVergisiz,
      gider: giderVergisiz,
      netKar: Math.round((gelirVergisiz - giderVergisiz) * 100) / 100,
      kdvTahsil,
      kdvOdenen,
      odenecekKdv: Math.round((kdvTahsil - kdvOdenen) * 100) / 100,
    };
  }, [filteredGelir, filteredGider]);

  const loading = faturalarLoading || purchasesLoading;

  return (
    <div className="dashboard">
      <div className="field field-wide">
        <label htmlFor="mh-ay">Dönem</label>
        <select id="mh-ay" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
          <option value="all">Tüm zamanlar</option>
          {[...months].reverse().map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="empty-state">Yükleniyor…</p>
      ) : (
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <TrendingUp size={18} />
              <div>
                <div className="stat-value balance-positive">{fmtCurrency(stats.gelir)}</div>
                <div className="stat-label">Toplam Gelir (vergisiz)</div>
              </div>
            </div>
            <div className="stat-card">
              <TrendingDown size={18} />
              <div>
                <div className="stat-value balance-negative">{fmtCurrency(stats.gider)}</div>
                <div className="stat-label">Toplam Gider (vergisiz)</div>
              </div>
            </div>
            <div className="stat-card">
              <Scale size={18} />
              <div>
                <div className={`stat-value ${stats.netKar >= 0 ? "balance-positive" : "balance-negative"}`}>
                  {fmtCurrency(stats.netKar)}
                </div>
                <div className="stat-label">Net Kâr</div>
              </div>
            </div>
          </div>

          <div className="stat-cards">
            <div className="stat-card">
              <Receipt size={18} />
              <div>
                <div className="stat-value">{fmtCurrency(stats.kdvTahsil)}</div>
                <div className="stat-label">Müşteriden Tahsil Edilen KDV</div>
              </div>
            </div>
            <div className="stat-card">
              <Receipt size={18} />
              <div>
                <div className="stat-value">{fmtCurrency(stats.kdvOdenen)}</div>
                <div className="stat-label">Satın Alımlarda Ödenen KDV</div>
              </div>
            </div>
            <div className="stat-card">
              <Receipt size={18} />
              <div>
                <div className={`stat-value ${stats.odenecekKdv >= 0 ? "balance-negative" : "balance-positive"}`}>
                  {fmtCurrency(Math.abs(stats.odenecekKdv))}
                </div>
                <div className="stat-label">{stats.odenecekKdv >= 0 ? "Ödenecek KDV" : "Devreden KDV"}</div>
              </div>
            </div>
          </div>

          <p className="dashboard-hint">
            Gelir: Fatura (satış) ve Satış fişleri - İrsaliye hariç, o bir teslimat belgesi, fatura değil. Gider:
            Satın Alma kayıtları (vergi oranı girilenlerde KDV ayrıştırılıyor, girilmeyenlerde tamamı vergisiz
            sayılıyor). Bu ekran resmî bir KDV beyannamesi değildir - muhasebecinizin hesaplarını kontrol etmek için
            bir özet sağlar.
          </p>
        </>
      )}
    </div>
  );
}
