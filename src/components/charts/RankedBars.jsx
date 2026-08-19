// Horizontal ranked bar chart - the default form for "compare magnitude,
// low -> high" (see dataviz skill's choosing-a-form.md). Each bar's value is
// direct-labeled at the tip (there are only ever a handful of rows here, so
// this is the normal/expected treatment, not the "label every point on a
// dense chart" anti-pattern). 4px rounded data-end, square at the baseline.
export default function RankedBars({ data, formatValue }) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <div className="ranked-bars">
      {data.map((d) => {
        const pct = (Math.abs(d.value) / max) * 100;
        return (
          <div key={d.id} className="ranked-bar-row" tabIndex={0}>
            <div className="ranked-bar-label" title={d.label}>
              {d.label}
            </div>
            <div className="ranked-bar-track">
              <div className="ranked-bar-fill" style={{ width: `${pct}%`, background: d.color }} />
            </div>
            <div className="ranked-bar-value">{formatValue(d.value)}</div>
          </div>
        );
      })}
    </div>
  );
}
