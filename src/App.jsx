import { useCallback, useEffect, useState } from "react";
import { ScanLine, PackagePlus, LogOut } from "lucide-react";
import ScannerView from "./components/ScannerView.jsx";
import ProductEntryDashboard from "./components/ProductEntryDashboard.jsx";
import LoginGate from "./components/LoginGate.jsx";
import { fetchAuthStatus, logout } from "./lib/api.js";

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
        <button className={`tab-btn ${view === "scanner" ? "active" : ""}`} onClick={() => setView("scanner")}>
          <ScanLine size={16} />
          Tarayıcı
        </button>
        <button className={`tab-btn ${view === "products" ? "active" : ""}`} onClick={() => setView("products")}>
          <PackagePlus size={16} />
          Ürün Girişi
        </button>
      </nav>

      {view === "scanner" ? (
        <ScannerView onSendToEntry={handleSendToEntry} />
      ) : (
        <ProductEntryDashboard prefillBarcode={prefillBarcode} onConsumePrefill={() => setPrefillBarcode(null)} />
      )}
    </div>
  );
}
