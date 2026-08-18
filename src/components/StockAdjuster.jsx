import { useEffect, useState } from "react";
import { Check } from "lucide-react";

// A number field + save button, used wherever a single numeric column
// (current stock, min. stock threshold) needs quick inline editing without
// a full form. `value` may be null (no stock tracked yet for this product).
export default function StockAdjuster({ value, onSave }) {
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const unchanged = draft === "" ? value == null : Number(draft) === Number(value);

  async function handleSave() {
    if (unchanged) return;
    setSaving(true);
    try {
      await onSave(draft === "" ? null : Number(draft));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stock-adjuster">
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
        }}
      />
      <button
        type="button"
        className="icon-btn"
        onClick={handleSave}
        disabled={saving || unchanged}
        aria-label="Kaydet"
        title="Kaydet"
      >
        <Check size={14} />
      </button>
    </div>
  );
}
