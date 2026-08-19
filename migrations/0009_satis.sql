-- Ürün Girişi'ne vergi oranı (KDV %) eklendi - Satış Fiyatları ekranının
-- "satış fiyatı + vergi = son satış fiyatı" hesaplaması buradan besleniyor.
ALTER TABLE products ADD COLUMN vergi_orani REAL;

-- Satış Fiyatları: stok (Ürün Girişi) ile Satış (POS) arasındaki ara katman
-- - yalnızca vergisiz taban satış fiyatını tutuyor. Vergi oranı burada
-- KOPYALANMIYOR, her zaman products'tan canlı okunuyor (worker/satisFiyatlari.js)
-- - böylece Ürün Girişi'nde vergi oranı değişirse son satış fiyatı otomatik
-- güncel kalır, eski kayıtlar bayatlamaz.
CREATE TABLE satis_fiyatlari (
  id TEXT PRIMARY KEY,
  barkod TEXT NOT NULL UNIQUE,
  satis_fiyati REAL NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_satis_fiyatlari_barkod ON satis_fiyatlari (barkod);

-- Satış (POS) ekranının kestiği fişler mevcut faturalar tablosunu
-- paylaşıyor (tur='fis') - ayrı bir tablo yerine Fatura'nın zaten
-- doğrulanmış evrak-no sayacı/yazdırma altyapısını yeniden kullanıyoruz.
-- Gün Sonu/Z Raporu bu kayıtlar üzerinden (tarih bazlı) hesaplanıyor.
ALTER TABLE fatura_ayarlari ADD COLUMN sonraki_fis_no INTEGER NOT NULL DEFAULT 1;
ALTER TABLE faturalar ADD COLUMN odeme_yontemi TEXT;
