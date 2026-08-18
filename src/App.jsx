import { useCallback, useState } from "react";
import { ScanLine, PackagePlus } from "lucide-react";
import ScannerView from "./components/ScannerView.jsx";
import ProductEntryDashboard from "./components/ProductEntryDashboard.jsx";

export default function App() {
  const [view, setView] = useState("scanner");
  const [prefillBarcode, setPrefillBarcode] = useState(null);

  // "Ürün girişine aktar" on a scanned row switches tabs and drops the code
  // straight into the product form.
  const handleSendToEntry = useCallback((code) => {
    setPrefillBarcode(code);
    setView("products");
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Barkod Okuyucu</h1>
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
