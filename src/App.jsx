import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScanLine, ClipboardList, PackagePlus, Tags, ShoppingBag, ShoppingCart, Landmark, AlertTriangle, Tag,
  LayoutDashboard, FileText, Truck, Warehouse, Settings, Sun, Moon, PanelLeft, PanelTop, PanelLeftClose,
  PanelLeftOpen, LogOut,
} from "lucide-react";
import { useTheme } from "./hooks/useTheme.js";
import { useNavLayout } from "./hooks/useNavLayout.js";
import { useProducts } from "./hooks/useProducts.js";
import { useUrunKatalog } from "./hooks/useUrunKatalog.js";
import { useSatisFiyatlari } from "./hooks/useSatisFiyatlari.js";
import { useModulAyarlari } from "./hooks/useModulAyarlari.js";
import { isLowStock } from "./lib/stock.js";
import ScannerView from "./components/ScannerView.jsx";
import UrunListesiDashboard from "./components/UrunListesiDashboard.jsx";
import ProductEntryDashboard from "./components/ProductEntryDashboard.jsx";
import SatisFiyatlariDashboard from "./components/SatisFiyatlariDashboard.jsx";
import SatisDashboard from "./components/SatisDashboard.jsx";
import PurchasingDashboard from "./components/PurchasingDashboard.jsx";
import CariHesapDashboard from "./components/CariHesapDashboard.jsx";
import LowStockDashboard from "./components/LowStockDashboard.jsx";
import LabelPrintDashboard from "./components/LabelPrintDashboard.jsx";
import ReportDashboard from "./components/ReportDashboard.jsx";
import FaturaDashboard from "./components/FaturaDashboard.jsx";
import LojistikDashboard from "./components/LojistikDashboard.jsx";
import IcLojistikDashboard from "./components/IcLojistikDashboard.jsx";
import AyarlarDashboard from "./components/AyarlarDashboard.jsx";
import LoginGate from "./components/LoginGate.jsx";
import { fetchAuthStatus, logout } from "./lib/api.js";

// Each new dashboard just needs an entry here - App.jsx doesn't otherwise
// need to change as the module list grows. "catalog" oturuyor Tarayıcı ile
// Ürün Girişi arasında - kullanıcının "ara ekran" isteği tam olarak bu konum.
// "satisFiyatlari"/"satis" da aynı mantıkla stok (products) ile satış
// arasında oturuyor. Her modül Ayarlar'dan açılıp kapatılabiliyor (bkz.
// hooks/useModulAyarlari.js) - "settings" kasıtlı olarak burada değil,
// ayrı ve daima görünür tutuluyor (bkz. aşağıdaki SETTINGS_TAB).
const TABS = [
  { id: "scanner", label: "Tarayıcı", icon: ScanLine },
  { id: "catalog", label: "Ürün Listesi", icon: ClipboardList },
  { id: "products", label: "Ürün Girişi", icon: PackagePlus },
  { id: "satisFiyatlari", label: "Satış Fiyatları", icon: Tags },
  { id: "satis", label: "Satış", icon: ShoppingBag },
  { id: "purchasing", label: "Satın Alma", icon: ShoppingCart },
  { id: "cari", label: "Cari Hesap", icon: Landmark },
  { id: "lowstock", label: "Düşük Stok", icon: AlertTriangle },
  { id: "labels", label: "Etiket Bas", icon: Tag },
  { id: "report", label: "Rapor", icon: LayoutDashboard },
  { id: "fatura", label: "Fatura", icon: FileText },
  { id: "lojistik", label: "Lojistik", icon: Truck },
  { id: "icLojistik", label: "İç Lojistik", icon: Warehouse },
];

const SETTINGS_TAB = { id: "settings", label: "Ayarlar", icon: Settings };

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { layout, toggleLayout } = useNavLayout();
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [view, setView] = useState("scanner");
  const [prefillBarcode, setPrefillBarcode] = useState(null);
  // Tek bir yerden çekilip Ürün Girişi ve Düşük Stok'a prop olarak veriliyor
  // - hem gereksiz çift fetch'i önlüyor hem de "Düşük Stok" sekme/menü
  // ikonundaki kırmızı rozeti (aşağıda lowStockCount) besliyor: bir ürünün
  // stoğu güncellenince rozet de aynı render'da güncelleniyor.
  const { products, loading: productsLoading, error: productsError, addProduct, updateProduct, removeProduct } =
    useProducts(authenticated);
  // Barkod -> ürün kimliği kataloğu (bkz. hooks/useUrunKatalog.js) - Ürün
  // Girişi, Satın Alma ve Lojistik'in hepsi aynı listeyi okuyor, otomatik
  // ad/kategori/birim doldurma için (bkz. lib/catalog.js).
  const { catalog, loading: catalogLoading, error: catalogError, addEntry, updateEntry, removeEntry } =
    useUrunKatalog(authenticated);
  // Satış Fiyatları (stok ile Satış/POS arasındaki ara katman) - Satış
  // ekranının barkod okutunca fiyat bulabilmesi için burada da lazım.
  const { fiyatlar, loading: fiyatlarLoading, error: fiyatlarError, addFiyat, updateFiyat, removeFiyat } =
    useSatisFiyatlari(authenticated);
  // Hangi modüllerin menüde görüneceği (bkz. hooks/useModulAyarlari.js) -
  // Ayarlar ekranından admin tarafından yönetiliyor.
  const { isModuleEnabled, toggleModule } = useModulAyarlari(authenticated);
  const lowStockCount = useMemo(() => products.filter(isLowStock).length, [products]);
  const visibleTabs = useMemo(() => TABS.filter((t) => isModuleEnabled(t.id)), [isModuleEnabled]);
  const navTabs = useMemo(() => [...visibleTabs, SETTINGS_TAB], [visibleTabs]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("barkod:sidebarCollapsed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    fetchAuthStatus()
      .then(setAuthenticated)
      .catch(() => setAuthenticated(false))
      .finally(() => setAuthChecked(true));
  }, []);

  // Admin şu an açık olan sekmeyi Ayarlar'dan kapatırsa (ör. başka bir
  // cihazda/sekmede), menüde olmayan bir görünümde kilitli kalınmasın diye
  // ilk görünür sekmeye yönlendir. "settings" zaten her zaman görünür.
  useEffect(() => {
    if (view === "settings") return;
    if (navTabs.some((t) => t.id === view)) return;
    if (visibleTabs.length > 0) setView(visibleTabs[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navTabs]);

  // "Ürün girişine aktar" on a scanned row switches tabs and drops the code
  // straight into the product form.
  const handleSendToEntry = useCallback((code) => {
    setPrefillBarcode(code);
    setView("products");
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem("barkod:sidebarCollapsed", next ? "1" : "0");
      } catch {
        // depolama yoksa tercih sadece bu oturumda kalır
      }
      return next;
    });
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
      {view === "catalog" && (
        <UrunListesiDashboard
          catalog={catalog}
          loading={catalogLoading}
          error={catalogError}
          addEntry={addEntry}
          updateEntry={updateEntry}
          removeEntry={removeEntry}
        />
      )}
      {view === "products" && (
        <ProductEntryDashboard
          prefillBarcode={prefillBarcode}
          onConsumePrefill={() => setPrefillBarcode(null)}
          products={products}
          loading={productsLoading}
          error={productsError}
          addProduct={addProduct}
          updateProduct={updateProduct}
          removeProduct={removeProduct}
          catalog={catalog}
        />
      )}
      {view === "satisFiyatlari" && (
        <SatisFiyatlariDashboard
          fiyatlar={fiyatlar}
          loading={fiyatlarLoading}
          error={fiyatlarError}
          addFiyat={addFiyat}
          updateFiyat={updateFiyat}
          removeFiyat={removeFiyat}
          catalog={catalog}
          products={products}
        />
      )}
      {view === "satis" && <SatisDashboard fiyatlar={fiyatlar} products={products} />}
      {view === "purchasing" && <PurchasingDashboard catalog={catalog} />}
      {view === "cari" && <CariHesapDashboard />}
      {view === "lowstock" && (
        <LowStockDashboard
          products={products}
          loading={productsLoading}
          error={productsError}
          updateProduct={updateProduct}
        />
      )}
      {view === "labels" && <LabelPrintDashboard />}
      {view === "report" && <ReportDashboard />}
      {view === "fatura" && <FaturaDashboard />}
      {view === "lojistik" && <LojistikDashboard catalog={catalog} />}
      {view === "icLojistik" && <IcLojistikDashboard catalog={catalog} />}
      {view === "settings" && (
        <AyarlarDashboard modules={TABS} isModuleEnabled={isModuleEnabled} toggleModule={toggleModule} />
      )}
    </>
  );

  if (layout === "sidebar") {
    return (
      <div className="app-shell">
        <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
          <div className="sidebar-top">
            {!sidebarCollapsed && <div className="sidebar-brand">Small ERP</div>}
            <button
              className="icon-btn sidebar-collapse-btn"
              onClick={toggleSidebarCollapsed}
              title={sidebarCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
          <nav className="sidebar-nav">
            {navTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`sidebar-link ${view === id ? "active" : ""}`}
                onClick={() => setView(id)}
                title={sidebarCollapsed ? label : undefined}
              >
                <span className="nav-icon-wrap">
                  <Icon size={18} />
                  {id === "lowstock" && lowStockCount > 0 && <span className="nav-badge">{lowStockCount}</span>}
                </span>
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
        {navTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`tab-btn ${view === id ? "active" : ""}`} onClick={() => setView(id)}>
            <span className="nav-icon-wrap">
              <Icon size={16} />
              {id === "lowstock" && lowStockCount > 0 && <span className="nav-badge">{lowStockCount}</span>}
            </span>
            {label}
          </button>
        ))}
      </nav>

      {activeDashboard}
    </div>
  );
}
