import { useState } from "react";
import { Plus } from "lucide-react";

export default function ManualEntry({ onAdd }) {
  const [value, setValue] = useState("");

  function submit(e) {
    e.preventDefault();
    const code = value.trim();
    if (!code) return;
    onAdd(code);
    setValue("");
  }

  return (
    <form className="manual-entry" onSubmit={submit}>
      <input
        type="text"
        inputMode="text"
        placeholder="Kodu elle yazın…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" aria-label="Ekle" title="Ekle">
        <Plus size={18} />
      </button>
    </form>
  );
}
