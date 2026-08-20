// Satış Fiyatları ve Satış (POS) ekranlarının paylaştığı fiyat/vergi
// hesaplama mantığı. Vergi oranı Ürün Girişi'nden (products) HER ZAMAN
// canlı okunuyor - satis_fiyatlari tablosunda kopyalanmıyor - böylece bir
// ürünün vergi oranı sonradan değişirse son satış fiyatı otomatik güncel
// kalır (bkz. migrations/0009_satis.sql).

// Bir barkod için en güncel ürün kaydını bulur - Ürün Girişi'nde aynı
// barkodla birden çok satır olabilir (her biri bir stok girişi), vergi
// oranı için en son girileni esas alıyoruz.
export function findLatestProductByBarcode(products, barkod) {
  const code = (barkod || "").trim();
  if (!code) return null;
  const matches = products.filter((p) => p.barkod === code);
  if (matches.length === 0) return null;
  return matches.reduce((latest, p) => ((p.createdAt || 0) > (latest.createdAt || 0) ? p : latest));
}

export function findSatisFiyati(fiyatlar, barkod) {
  const code = (barkod || "").trim();
  if (!code) return null;
  return fiyatlar.find((f) => f.barkod === code) || null;
}

// satış fiyatı (vergisiz taban) + vergi = son satış fiyatı (vergi dahil,
// müşteriye gösterilen/POS'a yansıyan fiyat).
export function sonSatisFiyati(satisFiyati, vergiOrani) {
  const fiyat = Number(satisFiyati) || 0;
  const vergi = Number(vergiOrani) || 0;
  return Math.round(fiyat * (1 + vergi / 100) * 100) / 100;
}

// Bir barkod için POS'ta kullanılacak tam fiyat bilgisini (taban fiyat,
// vergi oranı, son fiyat) tek çağrıda çözer - satış fiyatı tanımlı değilse
// null döner (POS bunu "önce fiyat tanımlayın" uyarısı için kullanıyor).
export function resolveSalePrice(barkod, { fiyatlar, products }) {
  const fiyatKaydi = findSatisFiyati(fiyatlar, barkod);
  if (!fiyatKaydi) return null;
  const urun = findLatestProductByBarcode(products, barkod);
  const vergiOrani = urun?.vergiOrani || 0;
  return {
    satisFiyati: fiyatKaydi.satisFiyati,
    vergiOrani,
    sonFiyat: sonSatisFiyati(fiyatKaydi.satisFiyati, vergiOrani),
    urunAdi: urun?.urunAdi || "",
    birim: urun?.birim || "",
  };
}

// Satış Fiyatları'nda tanımlı (dolayısıyla POS'ta satılabilir) tüm
// ürünlerin {barkod, urunAdi} listesi - Satış ekranında barkod yerine isme
// göre elle ekleme (datalist) için.
export function sellableProducts(fiyatlar, products) {
  return fiyatlar
    .map((f) => ({ barkod: f.barkod, urunAdi: findLatestProductByBarcode(products, f.barkod)?.urunAdi || f.barkod }))
    .sort((a, b) => a.urunAdi.localeCompare(b.urunAdi, "tr"));
}

// Ürün ADINA göre (tam, büyük/küçük harf duyarsız eşleşme) satılabilir
// barkodu bulur - kullanıcı datalist'ten bir isim seçtiğinde/yazdığında
// bunun hangi barkoda karşılık geldiğini çözmek için.
export function findBarcodeByName(name, { fiyatlar, products }) {
  const q = (name || "").trim().toLowerCase();
  if (!q) return null;
  const match = sellableProducts(fiyatlar, products).find((p) => p.urunAdi.toLowerCase() === q);
  return match?.barkod || null;
}
