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

// String comparison works correctly for ISO "YYYY-MM-DD" dates - no Date
// parsing/timezone ambiguity needed.
export function isPastDate(iso) {
  if (!iso) return false;
  return iso < todayISO();
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

const TURKISH_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

// "2026-08-19" -> "Bugün" / "Dün" / "19 Ağustos 2026" - the header shown
// above each day's group in the date-grouped tables (Satın Alma, Cari Hesap
// hareketleri, Lojistik).
export function dayLabel(iso) {
  if (!iso) return "Tarihsiz";
  if (iso === todayISO()) return "Bugün";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  // UTC-based, matching todayISO()'s own convention (see its definition) so
  // "Dün" and "Bugün" never disagree with each other near midnight.
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (iso === yesterday) return "Dün";
  return `${d} ${TURKISH_MONTHS[m - 1] ?? m} ${y}`;
}

// Buckets `items` by the date `getDate(item)` returns ("YYYY-MM-DD" or
// falsy), most recent day first; undated items land in one "Tarihsiz"
// bucket at the end rather than being scattered or dropped.
export function groupByDate(items, getDate) {
  const buckets = new Map(); // dateKey ("" = undated) -> items[]
  for (const item of items) {
    const key = getDate(item) || "";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }
  const dated = [...buckets.entries()]
    .filter(([key]) => key !== "")
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, groupItems]) => ({ key, label: dayLabel(key), items: groupItems }));
  const undated = buckets.get("");
  if (undated?.length) dated.push({ key: "undated", label: "Tarihsiz", items: undated });
  return dated;
}
