// Diverging bar chart - "above/below a baseline" (cari bakiye: positive vs
// negative around zero). Two hues + a neutral center line, equal scale per
// arm - see dataviz skill's choosing-a-form.md and lib/reportColors.js.
export default function DivergingBars({ data, formatValue }) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <div className="diverging-bars">
      {data.map((d) => {
        const pct = (Math.abs(d.value) / max) * 50; // half-track per side
        const positive = d.value >= 0;
        return (
          <div key={d.id} className="diverging-bar-row" tabIndex={0}>
            <div className="diverging-bar-label" title={d.label}>
              {d.label}
            </div>
            <div className="diverging-bar-track">
              <div className="diverging-bar-center" />
              <div
                className={`diverging-bar-fill ${positive ? "positive" : "negative"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className={positive ? "balance-positive" : "balance-negative"}>{formatValue(d.value)}</div>
          </div>
        );
      })}
    </div>
  );
}
