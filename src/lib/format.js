export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function trDate(iso) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

export function fmtCurrency(n) {
  if (n == null || n === "") return "-";
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return `${v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

// Compact form for chart labels/KPIs where full kuruş precision is just
// noise (₺12.450 rather than ₺12.450,00).
export function fmtCurrencyCompact(n) {
  if (n == null || n === "") return "-";
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return `${Math.round(v).toLocaleString("tr-TR")} ₺`;
}

const TURKISH_MONTHS_SHORT = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

// "2026-05" -> "May 26"
export function monthLabel(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return `${TURKISH_MONTHS_SHORT[(m ?? 1) - 1] ?? monthKey} ${String(y).slice(2)}`;
}

// Epoch ms or "YYYY-MM-DD" -> "YYYY-MM", for grouping records by month.
export function monthKeyOf(dateLike) {
  // `new Date(null)` silently coerces to epoch 0 instead of Invalid Date -
  // treat "nothing to group" explicitly rather than let it masquerade as
  // "1970-01".
  if (dateLike == null || dateLike === "") return null;
  // Date-only strings ("2026-08-01") parse as UTC midnight; re-deriving the
  // month via local getMonth() can roll back a day in negative-UTC-offset
  // zones. Slicing the string avoids Date parsing (and its timezone
  // ambiguity) entirely - there's no instant to convert, just a label.
  if (typeof dateLike === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateLike)) {
    return dateLike.slice(0, 7);
  }
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Last `count` months as "YYYY-MM" keys, oldest first, ending this month -
// used to fill in zero-value months a bar chart shouldn't just skip.
export function lastMonthKeys(count) {
  const now = new Date();
  const keys = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}
