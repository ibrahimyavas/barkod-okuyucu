import { useMemo } from "react";
import { Boxes, Wallet, ShoppingCart, Landmark, AlertTriangle } from "lucide-react";
import { useProducts } from "../hooks/useProducts.js";
import { usePurchases } from "../hooks/usePurchases.js";
import { useCariAccounts } from "../hooks/useCariAccounts.js";
import { isLowStock } from "../lib/stock.js";
import { fmtCurrency, fmtCurrencyCompact, monthLabel, monthKeyOf, lastMonthKeys } from "../lib/format.js";
import { SEQUENTIAL, DIVERGING_POSITIVE, DIVERGING_NEGATIVE, STATUS } from "../lib/reportColors.js";
import ChartCard from "./charts/ChartCard.jsx";
import RankedBars from "./charts/RankedBars.jsx";
import ColumnChart from "./charts/ColumnChart.jsx";
import DivergingBars from "./charts/DivergingBars.jsx";

const STATUS_LABEL = { beklemede: "Beklemede", kismi: "Kısmi", odendi: "Ödendi" };
const TOP_N = 8;

export default function ReportDashboard() {
  const { products, loading: productsLoading } = useProducts();
  const { purchases, loading: purchasesLoading } = usePurchases();
  const { accounts, loading: accountsLoading } = useCariAccounts();

  const kpis = useMemo(() => {
    const stockValue = products.reduce(
      (sum, p) => sum + (p.miktar != null && p.maliyet != null ? p.miktar * p.maliyet : 0),
      0
    );
    const kritikStok = products.filter(isLowStock).length;

    const thisMonthKey = lastMonthKeys(1)[0];
    const buAySatinAlma = purchases
      .filter((p) => monthKeyOf(p.tarih || p.createdAt) === thisMonthKey)
      .reduce((sum, p) => sum + (Number(p.toplamTutar) || 0), 0);

    let alacak = 0;
    let borc = 0;
    for (const a of accounts) {
      const v = Number(a.bakiye) || 0;
      if (v > 0) alacak += v;
      else borc += -v;
    }

    return { urunSayisi: products.length, stockValue, kritikStok, buAySatinAlma, alacak, borc };
  }, [products, purchases, accounts]);

  const categoryData = useMemo(() => {
    const counts = new Map();
    for (const p of products) {
      const key = p.kategori?.trim() || "Kategorisiz";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, TOP_N);
    const rest = sorted.slice(TOP_N).reduce((sum, [, c]) => sum + c, 0);
    if (rest > 0) top.push(["Diğer", rest]);
    return top.map(([label, value]) => ({ id: label, label, value, color: SEQUENTIAL }));
  }, [products]);

  const monthlySpend = useMemo(() => {
    const keys = lastMonthKeys(6);
    const sums = new Map(keys.map((k) => [k, 0]));
    for (const p of purchases) {
      const key = monthKeyOf(p.tarih || p.createdAt);
      if (key && sums.has(key)) sums.set(key, sums.get(key) + (Number(p.toplamTutar) || 0));
    }
    return keys.map((k) => ({ id: k, label: monthLabel(k), value: sums.get(k) || 0 }));
  }, [purchases]);

  const paymentStatusData = useMemo(() => {
    const sums = { beklemede: 0, kismi: 0, odendi: 0 };
    for (const p of purchases) {
      if (sums[p.odemeDurumu] != null) sums[p.odemeDurumu] += Number(p.toplamTutar) || 0;
    }
    return ["beklemede", "kismi", "odendi"].map((k) => ({
      id: k,
      label: STATUS_LABEL[k],
      value: sums[k],
      color: STATUS[k],
    }));
  }, [purchases]);

  const topCariData = useMemo(() => {
    return [...accounts]
      .filter((a) => Math.abs(Number(a.bakiye) || 0) > 0.004)
      .sort((a, b) => Math.abs(b.bakiye) - Math.abs(a.bakiye))
      .slice(0, 6)
      .map((a) => ({ id: a.id, label: a.ad, value: Number(a.bakiye) || 0 }))
      .map((d) => ({ ...d, color: d.value >= 0 ? DIVERGING_POSITIVE : DIVERGING_NEGATIVE }));
  }, [accounts]);

  const loading = productsLoading || purchasesLoading || accountsLoading;

  return (
    <div className="dashboard">
      <div className="stat-cards">
        <div className="stat-card">
          <Boxes size={18} />
          <div>
            <div className="stat-value">{kpis.urunSayisi}</div>
            <div className="stat-label">Ürün</div>
          </div>
        </div>
        <div className="stat-card">
          <Wallet size={18} />
          <div>
            <div className="stat-value">{fmtCurrencyCompact(kpis.stockValue)}</div>
            <div className="stat-label">Stok Değeri</div>
          </div>
        </div>
        <div className="stat-card">
          <AlertTriangle size={18} />
          <div>
            <div className="stat-value balance-negative">{kpis.kritikStok}</div>
            <div className="stat-label">Kritik Stok</div>
          </div>
        </div>
        <div className="stat-card">
          <ShoppingCart size={18} />
          <div>
            <div className="stat-value">{fmtCurrencyCompact(kpis.buAySatinAlma)}</div>
            <div className="stat-label">Bu Ay Satın Alma</div>
          </div>
        </div>
        <div className="stat-card">
          <Landmark size={18} />
          <div>
            <div className="stat-value balance-positive">{fmtCurrencyCompact(kpis.alacak)}</div>
            <div className="stat-label">Toplam Alacağımız</div>
          </div>
        </div>
        <div className="stat-card">
          <Landmark size={18} />
          <div>
            <div className="stat-value balance-negative">{fmtCurrencyCompact(kpis.borc)}</div>
            <div className="stat-label">Toplam Borcumuz</div>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="empty-state">Yükleniyor…</p>
      ) : (
        <>
          <ChartCard title="Kategoriye Göre Ürün Sayısı" data={categoryData} formatValue={(v) => `${v} ürün`}>
            <RankedBars data={categoryData} formatValue={(v) => `${v}`} />
          </ChartCard>

          <ChartCard title="Aylık Satın Alma Harcaması (son 6 ay)" data={monthlySpend} formatValue={fmtCurrencyCompact}>
            <ColumnChart data={monthlySpend} formatValue={fmtCurrencyCompact} />
          </ChartCard>

          <ChartCard
            title="Ödeme Durumuna Göre Satın Alma Tutarı"
            data={paymentStatusData}
            formatValue={fmtCurrencyCompact}
            legend={paymentStatusData.map((d) => ({ color: d.color, label: d.label }))}
          >
            <RankedBars data={paymentStatusData} formatValue={fmtCurrencyCompact} />
          </ChartCard>

          <ChartCard
            title="En Yüksek Bakiyeli Cariler"
            data={topCariData}
            formatValue={fmtCurrency}
            legend={[
              { color: DIVERGING_POSITIVE, label: "Bize borçlu" },
              { color: DIVERGING_NEGATIVE, label: "Biz borçluyuz" },
            ]}
          >
            <DivergingBars data={topCariData} formatValue={fmtCurrency} />
          </ChartCard>
        </>
      )}
    </div>
  );
}
