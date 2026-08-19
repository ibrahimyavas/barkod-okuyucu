// Ürün Girişi, Satın Alma ve Lojistik formlarının ortak barkod-eşleme
// mantığı: barkod alanı Ürün Listesi kataloğundaki bir kayıtla eşleşirse
// ad/kategori/birim tekrar elle yazılmasın.
export function findCatalogEntry(catalog, barkod) {
  const code = (barkod || "").trim();
  if (!code) return null;
  return catalog.find((c) => c.barkod === code) || null;
}

// Tarayıcı'da taranmış (bkz. hooks/useScanStore.js) ama Ürün Listesi
// kataloğunda henüz karşılığı olmayan kodlar - "ürün türü daha önce
// girilmemiş, yeni kayıt edilmesi gereken" barkodlar tam olarak bunlar.
// Ürün Listesi ve Ürün Girişi'nde bir hatırlatma/hızlı-seç listesi olarak
// gösteriliyor (bkz. UncatalogedScansPanel.jsx).
export function getUncatalogedScans(scans, catalog) {
  const known = new Set(catalog.map((c) => c.barkod));
  return scans.filter((s) => !known.has(s.code));
}
