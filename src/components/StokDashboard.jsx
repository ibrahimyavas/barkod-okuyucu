import { useMemo, useState } from "react";
import { Boxes, AlertTriangle, PackageX, Search } from "lucide-react";
import { stockStatus, isLowStock } from "../lib/stock.js";
import StockAdjuster from "./StockAdjuster.jsx";
import LowStockAlert from "./LowStockAlert.jsx";

// En acil önce görünsün diye: tükenen (0) -> kritik (1) -> stok takibi
// yapılan normal ürün (2) -> stok takibi hiç yapılmayan (min. stok
// girilmemiş) ürün (3, dikkat gerektirmediği için en altta).
function severityRank(p) {
  if (isLowStock(p)) return p.miktar <= 0 ? 0 : 1;
  if (p.minStok == null) return 3;
  return 2;
}

// Önceden yalnızca kritik seviyedeki ürünleri gösteren dar bir "Düşük Stok"
// ekranıydı - artık TÜM ürünlerin stok durumunu gösteren genel bir envanter
// görünümü, en acil olanlar en üstte. Uyarı (LowStockAlert banner + nav
// rozeti, bkz. App.jsx lowStockCount) hâlâ tam olarak eskisi gibi çalışıyor
// - yalnızca ana tablo artık her şeyi kapsıyor.
export default function StokDashboard({ products, loading, error, updateProduct }) {
  const [query, setQuery] = useState("");

  const lowStock = useMemo(() => products.filter(isLowStock), [products]);

  const sorted = useMemo(() => {
    return [...products].sort(
      (a, b) => severityRank(a) - severityRank(b) || (a.urunAdi || "").localeCompare(b.urunAdi || "", "tr")
    );
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((p) => [p.urunAdi, p.barkod, p.kategori].some((v) => v?.toLowerCase().includes(q)));
  }, [sorted, query]);

  const stats = useMemo(() => {
    const kritik = lowStock.length;
    const tukendi = lowStock.filter((p) => p.miktar <= 0).length;
    return { toplam: products.length, kritik, tukendi };
  }, [products, lowStock]);

  return (
    <div className="dashboard">
      <LowStockAlert items={lowStock} criticalCount={stats.kritik} outOfStockCount={stats.tukendi} />

      <div className="stat-cards">
        <div className="stat-card">
          <Boxes size={18} />
          <div>
            <div className="stat-value">{stats.toplam}</div>
            <div className="stat-label">Toplam Ürün</div>
          </div>
        </div>
        <div className="stat-card">
          <AlertTriangle size={18} />
          <div>
            <div className="stat-value balance-negative">{stats.kritik}</div>
            <div className="stat-label">Kritik Seviyede Ürün</div>
          </div>
        </div>
        <div className="stat-card">
          <PackageX size={18} />
          <div>
            <div className="stat-value balance-negative">{stats.tukendi}</div>
            <div className="stat-label">Tükenen Ürün</div>
          </div>
        </div>
      </div>

      <div className="scan-table-wrap">
        <div className="scan-search">
          <Search size={16} />
          <input type="text" placeholder="Ürün ara…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="empty-state">Yükleniyor…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">
            {products.length === 0 ? "Henüz ürün girişi yapılmadı." : "Aramayla eşleşen ürün yok."}
          </p>
        ) : (
          <div className="scan-table-scroll">
            <table className="scan-table">
              <thead>
                <tr>
                  <th>Ürün Adı</th>
                  <th>Kategori</th>
                  <th>Konum</th>
                  <th>Stok</th>
                  <th>Min.</th>
                  <th>Fark</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const status = stockStatus(p.miktar, p.minStok);
                  const fark = p.miktar != null && p.minStok != null ? p.miktar - p.minStok : null;
                  return (
                    <tr key={p.id}>
                      <td>{p.urunAdi}</td>
                      <td className="muted">{p.kategori || "-"}</td>
                      <td className="muted">{p.depoKonumu || "-"}</td>
                      <td>
                        <StockAdjuster value={p.miktar} onSave={(v) => updateProduct(p.id, { miktar: v })} />
                        {p.birim && <span className="muted unit-suffix">{p.birim}</span>}
                      </td>
                      <td className="muted">{p.minStok ?? "-"}</td>
                      <td className={fark != null && fark <= 0 ? "balance-negative" : "muted"}>{fark ?? "-"}</td>
                      <td className={status.cls}>{status.label}</td>
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
