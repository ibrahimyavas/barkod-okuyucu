import { useState } from "react";
import { Table2, BarChart3 } from "lucide-react";

// Shared chrome for every report chart: title, optional legend (status/
// diverging charts need one - identity must never ride on color alone),
// and a table-view toggle - the WCAG-clean twin of any chart, always
// reachable without touching a mark.
export default function ChartCard({ title, legend, data, formatValue, children }) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3>{title}</h3>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setShowTable((v) => !v)}
          title={showTable ? "Grafiği göster" : "Tablo olarak göster"}
        >
          {showTable ? <BarChart3 size={14} /> : <Table2 size={14} />}
        </button>
      </div>

      {legend && !showTable && (
        <div className="chart-legend">
          {legend.map((l) => (
            <span key={l.label} className="chart-legend-item">
              <span className="chart-legend-swatch" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}

      {data.length === 0 ? (
        <p className="empty-state">Gösterilecek veri yok.</p>
      ) : showTable ? (
        <table className="scan-table">
          <thead>
            <tr>
              <th>Ad</th>
              <th>Değer</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id}>
                <td>{d.label}</td>
                <td>{formatValue(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        children
      )}
    </div>
  );
}
