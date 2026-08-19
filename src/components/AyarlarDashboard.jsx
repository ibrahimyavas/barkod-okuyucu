import { useMemo } from "react";
import { Settings } from "lucide-react";

const GROUP_LABELS = { operasyon: "Operasyon", tanimlama: "Tanımlama" };
const GROUP_ORDER = ["operasyon", "tanimlama"];

// Admin (giriş yapan herkes - uygulamada tek paylaşılan şifre var) hangi
// modüllerin menüde görüneceğini burada seçiyor. "Ayarlar" kendisi asla
// kapatılamaz (bkz. App.jsx - listeye dahil edilmiyor), aksi hâlde admin
// kendini bu ekrandan dışlayabilirdi. Liste, menüdeki gibi Operasyon/
// Tanımlama olarak gruplanıyor (bkz. App.jsx TABS[].group).
export default function AyarlarDashboard({ modules, isModuleEnabled, toggleModule }) {
  const groups = useMemo(
    () => GROUP_ORDER.map((g) => ({ id: g, label: GROUP_LABELS[g], items: modules.filter((m) => m.group === g) })).filter(
      (g) => g.items.length > 0
    ),
    [modules]
  );

  return (
    <div className="dashboard">
      <div className="stat-cards">
        <div className="stat-card">
          <Settings size={18} />
          <div>
            <div className="stat-value">{modules.filter((m) => isModuleEnabled(m.id)).length}</div>
            <div className="stat-label">Aktif Modül / {modules.length}</div>
          </div>
        </div>
      </div>

      <p className="dashboard-hint">
        İhtiyacınız olmayan modülleri kapatın - menüden kaybolur, veriler silinmez, istediğiniz zaman tekrar
        açabilirsiniz.
      </p>

      {groups.map((g) => (
        <div key={g.id}>
          <p className="module-settings-group-label">{g.label}</p>
          <div className="module-settings-list">
            {g.items.map((m) => {
              const enabled = isModuleEnabled(m.id);
              return (
                <label key={m.id} className="module-settings-row">
                  <span className="module-settings-info">
                    <m.icon size={16} />
                    {m.label}
                  </span>
                  <input type="checkbox" checked={enabled} onChange={(e) => toggleModule(m.id, e.target.checked)} />
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
