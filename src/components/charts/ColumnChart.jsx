// Vertical column chart - "trend over time" bucketed by month. Columns
// rather than a line: at monthly granularity with few buckets, a per-bucket
// magnitude comparison reads at least as clearly as a line and needs no
// crosshair/hit-target machinery.
export default function ColumnChart({ data, formatValue }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="column-chart">
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={d.id} className="column-bar-wrap" tabIndex={0}>
            <div className="column-bar-value">{d.value > 0 ? formatValue(d.value) : ""}</div>
            <div className="column-bar-track">
              <div className="column-bar-fill" style={{ height: `${pct}%` }} />
            </div>
            <div className="column-bar-label">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}
