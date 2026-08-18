// Shared stock-level classification, used by both the Ürün Girişi table and
// the Düşük Stok Uyarısı dashboard so the two never disagree about what
// counts as "critical".
export function stockStatus(miktar, minStok) {
  if (miktar == null || minStok == null) return { label: "-", cls: "" };
  if (miktar <= 0) return { label: "Tükendi", cls: "balance-negative" };
  if (miktar <= minStok) return { label: "Kritik", cls: "balance-negative" };
  return { label: "Normal", cls: "balance-positive" };
}

export function isLowStock(product) {
  return product.miktar != null && product.minStok != null && product.miktar <= product.minStok;
}
