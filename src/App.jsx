import { useCallback, useEffect, useState } from "react";
import {
  ScanLine, PackagePlus, ShoppingCart, Landmark, AlertTriangle, Tag, LayoutDashboard, FileText, Truck,
  Sun, Moon, PanelLeft, PanelTop, LogOut,
} from "lucide-react";
import { useTheme } from "./hooks/useTheme.js";
import { useNavLayout } from "./hooks/useNavLayout.js";
import ScannerView from "./components/ScannerView.jsx";
import ProductEntryDashboard from "./components/ProductEntryDashboard.jsx";
import PurchasingDashboard from "./components/PurchasingDashboard.jsx";
import CariHesapDashboard from "./components/CariHesapDashboard.jsx";
import LowStockDashboard from "./components/LowStockDashboard.jsx";
import LabelPrintDashboard from "./components/LabelPrintDashboard.jsx";
import ReportDashboard from "./components/ReportDashboard.jsx";
import FaturaDashboard from "./components/FaturaDashboard.jsx";
import LojistikDashboard from "./components/LojistikDashboard.jsx";
import LoginGate from "./components/LoginGate.jsx";
import { fetchAuthStatus, logout } from "./lib/api.js";

// Each new dashboard just needs an entry here - App.jsx doesn't otherwise
// need to change as the module list grows.
const TABS = [
  { id: "scanner", label: "Tarayıcı", icon: ScanLine },
  { id: "products", label: "Ürün Girişi", icon: PackagePlus },
  { id: "purchasing", label: "Satın Alma", icon: ShoppingCart },
  { id: "cari", label: "Cari Hesap", icon: Landmark },
  { id: "lowstock", label: "Düşük Stok", icon: AlertTriangle },
  { id: "labels", label: "Etiket Bas", icon: Tag },
  { id: "report", label: "Rapor", icon: LayoutDashboard },
  { id: "fatura", label: "Fatura", icon: FileText },
  { id: "lojistik", label: "Lojistik", icon: Truck },
];

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { layout, toggleLayout } = useNavLayout();
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [view, setView] = useState("scanner");
  const [prefillBarcode, setPrefillBarcode] = useState(null);

  useEffect(() => {
    fetchAuthStatus()
      .then(setAuthenticated)
      .catch(() => setAuthenticated(false))
      .finally(() => setAuthChecked(true));
  }, []);

  // "Ürün girişine aktar" on a scanned row switches tabs and drops the code
  // straight into the product form.
  const handleSendToEntry = useCallback((code) => {
    setPrefillBarcode(code);
    setView("products");
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      setAuthenticated(false);
    }
  }, []);

  if (!authChecked) {
    return <div className="app-loading">Yükleniyor…</div>;
  }

  if (!authenticated) {
    return <LoginGate onSuccess={() => setAuthenticated(true)} />;
  }

  const themeToggleBtn = (
    <button
      className="icon-btn"
      onClick={toggleTheme}
      title={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
    >
      {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );

  const layoutToggleBtn = (
    <button
      className="icon-btn"
      onClick={toggleLayout}
      title={layout === "sidebar" ? "Üst sekme şeridine geç" : "Sol menüye geç"}
    >
      {layout === "sidebar" ? <PanelTop size={16} /> : <PanelLeft size={16} />}
    </button>
  );

  const logoutBtn = (
    <button className="icon-btn" onClick={handleLogout} title="Çıkış yap">
      <LogOut size={16} />
    </button>
  );

  const activeDashboard = (
    <>
      {view === "scanner" && <ScannerView onSendToEntry={handleSendToEntry} />}
      {view === "products" && (
        <ProductEntryDashboard prefillBarcode={prefillBarcode} onConsumePrefill={() => setPrefillBarcode(null)} />
      )}
      {view === "purchasing" && <PurchasingDashboard />}
      {view === "cari" && <CariHesapDashboard />}
      {view === "lowstock" && <LowStockDashboard />}
      {view === "labels" && <LabelPrintDashboard />}
      {view === "report" && <ReportDashboard />}
      {view === "fatura" && <FaturaDashboard />}
      {view === "lojistik" && <LojistikDashboard />}
    </>
  );

  if (layout === "sidebar") {
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">Small ERP</div>
          <nav className="sidebar-nav">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`sidebar-link ${view === id ? "active" : ""}`}
                onClick={() => setView(id)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            {layoutToggleBtn}
            {themeToggleBtn}
            {logoutBtn}
          </div>
        </aside>
        <main className="main-content">{activeDashboard}</main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Small ERP</h1>
        <div className="header-actions">
          {layoutToggleBtn}
          {themeToggleBtn}
          {logoutBtn}
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`tab-btn ${view === id ? "active" : ""}`} onClick={() => setView(id)}>
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {activeDashboard}
    </div>
  );
}
