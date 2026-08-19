import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

const KEY = "barkod:lowStockAlertCollapsed";

// Düşük Stok dashboard'unun üstünde duran, göze çarpan bir uyarı şeridi -
// tablodaki bilgiyi tekrar etmek yerine "kaç ürün kritik/tükendi" özetini
// hemen göze sokuyor. Kullanıcı isterse ince bir çubuğa küçültebiliyor
// (tercih localStorage'da kalıcı, hooks/useNavLayout.js ile aynı desen),
// böylece sürekli aynı alanı kaplaması gerekmiyor.
export default function LowStockAlert({ items, criticalCount, outOfStockCount }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });

  if (criticalCount === 0) return null;

  const severity = outOfStockCount > 0 ? "danger" : "warning";
  const toggle = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        // depolama yoksa tercih sadece bu oturumda kalır
      }
      return next;
    });
  };

  const headline =
    outOfStockCount > 0
      ? `${criticalCount} ürün kritik seviyede, ${outOfStockCount} ürün tükendi`
      : `${criticalCount} ürün kritik seviyede`;

  // En acil 5 ürün - miktarı en düşük (zaten çağıran taraf sıralı gönderiyor).
  const topItems = items.slice(0, 5);

  return (
    <div className={`low-stock-alert low-stock-alert-${severity} ${collapsed ? "collapsed" : ""}`}>
      <button type="button" className="low-stock-alert-header" onClick={toggle}>
        <AlertTriangle size={16} />
        <span className="low-stock-alert-headline">{headline}</span>
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
      {!collapsed && (
        <ul className="low-stock-alert-items">
          {topItems.map((p) => (
            <li key={p.id}>
              <span className="low-stock-alert-item-name">{p.urunAdi}</span>
              <span className="low-stock-alert-item-qty">
                {p.miktar}
                {p.birim ? ` ${p.birim}` : ""} / min {p.minStok}
              </span>
            </li>
          ))}
          {items.length > topItems.length && (
            <li className="low-stock-alert-more">+{items.length - topItems.length} ürün daha - tam listeyi aşağıda görün</li>
          )}
        </ul>
      )}
    </div>
  );
}
