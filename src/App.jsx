import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  ScanLine, ClipboardList, PackagePlus, Tags, ShoppingBag, ShoppingCart, Landmark, Boxes, Tag,
  LayoutDashboard, FileText, Truck, Warehouse, Building2, Users, Settings, Sun, Moon, PanelLeft, PanelTop,
  PanelLeftClose, PanelLeftOpen, LogOut, Wallet,
} from "lucide-react";
import { useTheme } from "./hooks/useTheme.js";
import { useNavLayout } from "./hooks/useNavLayout.js";
import { useProducts } from "./hooks/useProducts.js";
import { useUrunKatalog } from "./hooks/useUrunKatalog.js";
import { useSatisFiyatlari } from "./hooks/useSatisFiyatlari.js";
import { useModulAyarlari } from "./hooks/useModulAyarlari.js";
import { useSuppliers } from "./hooks/useSuppliers.js";
import { useCustomers } from "./hooks/useCustomers.js";
import { isLowStock } from "./lib/stock.js";
import ScannerView from "./components/ScannerView.jsx";
import UrunListesiDashboard from "./components/UrunListesiDashboard.jsx";
import ProductEntryDashboard from "./components/ProductEntryDashboard.jsx";
import SatisFiyatlariDashboard from "./components/SatisFiyatlariDashboard.jsx";
import SatisDashboard from "./components/SatisDashboard.jsx";
import PurchasingDashboard from "./components/PurchasingDashboard.jsx";
import TedarikcilerDashboard from "./components/TedarikcilerDashboard.jsx";
import MusterilerDashboard from "./components/MusterilerDashboard.jsx";
import CariHesapDashboard from "./components/CariHesapDashboard.jsx";
import StokDashboard from "./components/StokDashboard.jsx";
import LabelPrintDashboard from "./components/LabelPrintDashboard.jsx";
import ReportDashboard from "./components/ReportDashboard.jsx";
import FaturaDashboard from "./components/FaturaDashboard.jsx";
import LojistikDashboard from "./components/LojistikDashboard.jsx";
import IcLojistikDashboard from "./components/IcLojistikDashboard.jsx";
import MuhasebeDashboard from "./components/MuhasebeDashboard.jsx";
import AyarlarDashboard from "./components/AyarlarDashboard.jsx";
import LoginGate from "./components/LoginGate.jsx";
import { fetchAuthStatus, logout } from "./lib/api.js";

// Each new dashboard just needs an entry here - App.jsx doesn't otherwise
// need to change as the module list grows. Her modül Ayarlar'dan açılıp
// kapatılabiliyor (bkz. hooks/useModulAyarlari.js) - "settings" kasıtlı
// olarak burada değil, ayrı ve daima görünür tutuluyor (bkz. aşağıdaki
// SETTINGS_TAB).
//
// `group`: "operasyon" (günlük kullanım - taranan/satılan/izlenen) vs
// "tanimlama" (saf veri girişi - ürün/tedarikçi/müşteri/fiyat tanımlama).
// Operasyon önce, daha kolay erişilebilir olsun diye (bkz. GROUP_ORDER,
// menüde grup başlıklarıyla ayrılıyor - bkz. aşağıdaki nav render).
const TABS = [
  { id: "scanner", label: "Tarayıcı", icon: ScanLine, group: "operasyon" },
  { id: "satis", label: "Satış", icon: ShoppingBag, group: "operasyon" },
  { id: "purchasing", label: "Satın Alma", icon: ShoppingCart, group: "operasyon" },
  { id: "cari", label: "Cari Hesap", icon: Landmark, group: "operasyon" },
  { id: "lowstock", label: "Stok", icon: Boxes, group: "operasyon" },
  { id: "labels", label: "Etiket Bas", icon: Tag, group: "operasyon" },
  { id: "report", label: "Rapor", icon: LayoutDashboard, group: "operasyon" },
  { id: "fatura", label: "Fatura", icon: FileText, group: "operasyon" },
  { id: "muhasebe", label: "Muhasebe", icon: Wallet, group: "operasyon" },
  { id: "lojistik", label: "Lojistik", icon: Truck, group: "operasyon" },
  { id: "icLojistik", label: "İç Lojistik", icon: Warehouse, group: "operasyon" },
  { id: "catalog", label: "Ürün Listesi", icon: ClipboardList, group: "tanimlama" },
  { id: "products", label: "Ürün Girişi", icon: PackagePlus, group: "tanimlama" },
  { id: "satisFiyatlari", label: "Satış Fiyatları", icon: Tags, group: "tanimlama" },
  { id: "suppliers", label: "Tedarikçiler", icon: Building2, group: "tanimlama" },
  { id: "customers", label: "Müşteriler", icon: Users, group: "tanimlama" },
];

const GROUP_LABELS = { operasyon: "Operasyon", tanimlama: "Tanımlama" };
const GROUP_ORDER = ["operasyon", "tanimlama"];

const SETTINGS_TAB = { id: "settings", label: "Ayarlar", icon: Settings };

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { layout, toggleLayout } = useNavLayout();
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [view, setView] = useState("scanner");
  const [prefillBarcode, setPrefillBarcode] = useState(null);
  // Tek bir yerden çekilip Ürün Girişi ve Stok'a prop olarak veriliyor - hem
  // gereksiz çift fetch'i önlüyor hem de "Stok" sekme/menü ikonundaki
  // kırmızı rozeti (aşağıda lowStockCount) besliyor: bir ürünün stoğu
  // güncellenince (ve düşük stoğa girip/çıkınca) rozet de aynı render'da
  // güncelleniyor - "Stok" genel bir envanter görünümü olsa da uyarı hâlâ
  // tam olarak eskisi gibi düşük stok tetiklendiğinde çalışıyor.
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
  // Tedarikçiler (alış) / Müşteriler (satış) - tek yerden çekilip Satın
  // Alma, Satış, Fatura ve Lojistik'e prop olarak veriliyor: birinde
  // tanımlanan şirket diğerlerinde otomatik seçenek olarak çıkıyor.
  const { suppliers, loading: suppliersLoading, error: suppliersError, addSupplier, editSupplier, removeSupplier } =
    useSuppliers();
  const { customers, loading: customersLoading, error: customersError, addCustomer, editCustomer, removeCustomer } =
    useCustomers();
  const lowStockCount = useMemo(() => products.filter(isLowStock).length, [products]);
  const visibleTabs = useMemo(() => TABS.filter((t) => isModuleEnabled(t.id)), [isModuleEnabled]);
  const navTabs = useMemo(() => [...visibleTabs, SETTINGS_TAB], [visibleTabs]);
  // Menüde iki bölüm - Operasyon (üstte, öncelikli) ve Tanımlama (altta) -
  // bkz. TABS'taki `group` alanı. Boş kalan grup (hepsi kapatılmışsa)
  // basitçe atlanıyor.
  const navGroups = useMemo(
    () =>
      GROUP_ORDER.map((g) => ({ id: g, label: GROUP_LABELS[g], tabs: visibleTabs.filter((t) => t.group === g) })).filter(
        (g) => g.tabs.length > 0
      ),
    [visibleTabs]
  );
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
      {view === "satis" && <SatisDashboard fiyatlar={fiyatlar} products={products} customers={customers} />}
      {view === "purchasing" && <PurchasingDashboard catalog={catalog} suppliers={suppliers} />}
      {view === "suppliers" && (
        <TedarikcilerDashboard
          suppliers={suppliers}
          loading={suppliersLoading}
          error={suppliersError}
          addSupplier={addSupplier}
          editSupplier={editSupplier}
          removeSupplier={removeSupplier}
        />
      )}
      {view === "customers" && (
        <MusterilerDashboard
          customers={customers}
          loading={customersLoading}
          error={customersError}
          addCustomer={addCustomer}
          editCustomer={editCustomer}
          removeCustomer={removeCustomer}
        />
      )}
      {view === "cari" && <CariHesapDashboard />}
      {view === "lowstock" && (
        <StokDashboard
          products={products}
          loading={productsLoading}
          error={productsError}
          updateProduct={updateProduct}
        />
      )}
      {view === "labels" && <LabelPrintDashboard />}
      {view === "report" && <ReportDashboard />}
      {view === "fatura" && <FaturaDashboard suppliers={suppliers} customers={customers} />}
      {view === "muhasebe" && <MuhasebeDashboard />}
      {view === "lojistik" && <LojistikDashboard catalog={catalog} suppliers={suppliers} customers={customers} />}
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
            {navGroups.map((g) => (
              <div key={g.id} className="sidebar-nav-group">
                {!sidebarCollapsed && <div className="sidebar-group-label">{g.label}</div>}
                {g.tabs.map(({ id, label, icon: Icon }) => (
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
              </div>
            ))}
            <div className="sidebar-nav-group sidebar-nav-group-settings">
              <button
                className={`sidebar-link ${view === "settings" ? "active" : ""}`}
                onClick={() => setView("settings")}
                title={sidebarCollapsed ? "Ayarlar" : undefined}
              >
                <span className="nav-icon-wrap">
                  <Settings size={18} />
                </span>
                <span>Ayarlar</span>
              </button>
            </div>
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
        {navGroups.map((g, gi) => (
          <Fragment key={g.id}>
            {g.tabs.map(({ id, label, icon: Icon }, i) => (
              <button
                key={id}
                className={`tab-btn ${view === id ? "active" : ""} ${gi > 0 && i === 0 ? "tab-group-start" : ""}`}
                onClick={() => setView(id)}
              >
                <span className="nav-icon-wrap">
                  <Icon size={16} />
                  {id === "lowstock" && lowStockCount > 0 && <span className="nav-badge">{lowStockCount}</span>}
                </span>
                {label}
              </button>
            ))}
          </Fragment>
        ))}
        <button
          className={`tab-btn tab-group-start ${view === "settings" ? "active" : ""}`}
          onClick={() => setView("settings")}
        >
          <span className="nav-icon-wrap">
            <Settings size={16} />
          </span>
          Ayarlar
        </button>
      </nav>

      {activeDashboard}
    </div>
  );
}
