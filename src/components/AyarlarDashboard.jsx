import { Settings } from "lucide-react";

// Admin (giriş yapan herkes - uygulamada tek paylaşılan şifre var) hangi
// modüllerin menüde görüneceğini burada seçiyor. "Ayarlar" kendisi asla
// kapatılamaz (bkz. App.jsx - listeye dahil edilmiyor), aksi hâlde admin
// kendini bu ekrandan dışlayabilirdi.
export default function AyarlarDashboard({ modules, isModuleEnabled, toggleModule }) {
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

      <div className="module-settings-list">
        {modules.map((m) => {
          const enabled = isModuleEnabled(m.id);
          return (
            <label key={m.id} className="module-settings-row">
              <span className="module-settings-info">
                <m.icon size={16} />
                {m.label}
              </span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => toggleModule(m.id, e.target.checked)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
