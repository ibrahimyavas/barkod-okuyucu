// Ürün Girişi, Satın Alma ve Lojistik formlarının ortak barkod-eşleme
// mantığı: barkod alanı Ürün Listesi kataloğundaki bir kayıtla eşleşirse
// ad/kategori/birim tekrar elle yazılmasın.
export function findCatalogEntry(catalog, barkod) {
  const code = (barkod || "").trim();
  if (!code) return null;
  return catalog.find((c) => c.barkod === code) || null;
}
