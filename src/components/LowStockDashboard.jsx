import { useMemo, useState } from "react";
import { AlertTriangle, PackageX, Search } from "lucide-react";
import { stockStatus, isLowStock } from "../lib/stock.js";
import StockAdjuster from "./StockAdjuster.jsx";
import LowStockAlert from "./LowStockAlert.jsx";

export default function LowStockDashboard({ products, loading, error, updateProduct }) {
  const [query, setQuery] = useState("");

  const lowStock = useMemo(() => {
    return products
      .filter(isLowStock)
      .sort((a, b) => a.miktar - b.miktar); // en kritik en üstte
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lowStock;
    return lowStock.filter((p) => [p.urunAdi, p.barkod, p.kategori].some((v) => v?.toLowerCase().includes(q)));
  }, [lowStock, query]);

  const stats = useMemo(() => {
    const kritik = lowStock.length;
    const tukendi = lowStock.filter((p) => p.miktar <= 0).length;
    return { kritik, tukendi };
  }, [lowStock]);

  return (
    <div className="dashboard">
      <LowStockAlert items={lowStock} criticalCount={stats.kritik} outOfStockCount={stats.tukendi} />

      <div className="stat-cards">
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
            {lowStock.length === 0
              ? "Kritik seviyede ürün yok 🎉 (Min. stok tanımlı ürünlerin hepsi eşiğin üstünde.)"
              : "Aramayla eşleşen ürün yok."}
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
                  const fark = p.miktar - p.minStok;
                  return (
                    <tr key={p.id}>
                      <td>{p.urunAdi}</td>
                      <td className="muted">{p.kategori || "-"}</td>
                      <td className="muted">{p.depoKonumu || "-"}</td>
                      <td>
                        <StockAdjuster value={p.miktar} onSave={(v) => updateProduct(p.id, { miktar: v })} />
                        {p.birim && <span className="muted unit-suffix">{p.birim}</span>}
                      </td>
                      <td className="muted">{p.minStok}</td>
                      <td className="balance-negative">{fark}</td>
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
