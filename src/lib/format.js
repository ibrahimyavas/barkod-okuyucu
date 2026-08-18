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
