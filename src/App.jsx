import { useCallback, useEffect, useState } from "react";
import { ScanLine, PackagePlus, ShoppingCart, LogOut } from "lucide-react";
import ScannerView from "./components/ScannerView.jsx";
import ProductEntryDashboard from "./components/ProductEntryDashboard.jsx";
import PurchasingDashboard from "./components/PurchasingDashboard.jsx";
import LoginGate from "./components/LoginGate.jsx";
import { fetchAuthStatus, logout } from "./lib/api.js";

// Each new dashboard just needs an entry here - App.jsx doesn't otherwise
// need to change as the module list grows.
const TABS = [
  { id: "scanner", label: "Tarayıcı", icon: ScanLine },
  { id: "products", label: "Ürün Girişi", icon: PackagePlus },
  { id: "purchasing", label: "Satın Alma", icon: ShoppingCart },
];

export default function App() {
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Barkod Okuyucu</h1>
        <button className="icon-btn" onClick={handleLogout} title="Çıkış yap">
          <LogOut size={16} />
        </button>
      </header>

      <nav className="tab-nav">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`tab-btn ${view === id ? "active" : ""}`} onClick={() => setView(id)}>
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {view === "scanner" && <ScannerView onSendToEntry={handleSendToEntry} />}
      {view === "products" && (
        <ProductEntryDashboard prefillBarcode={prefillBarcode} onConsumePrefill={() => setPrefillBarcode(null)} />
      )}
      {view === "purchasing" && <PurchasingDashboard />}
    </div>
  );
}
