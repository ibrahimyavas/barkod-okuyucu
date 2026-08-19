-- Barkod <-> ürün kimliği kataloğu. Ürün Girişi'nden (products) kasıtlı
-- olarak ayrı: products her "stok girişi" satırını (miktar, maliyet, alınış
-- tarihi ile) tutuyor, bu tablo ise "bu barkod hangi ürün" eşlemesini TEK
-- bir yerde tutuyor - aynı barkod tekrar girildiğinde ad/kategori/birim
-- elle yeniden yazılmasın diye (bkz. ProductEntryDashboard'daki otomatik
-- doldurma). barkod UNIQUE - bir barkodun kataloğa iki farklı ürün olarak
-- girilmesinin bir anlamı yok.
CREATE TABLE urun_katalog (
  id TEXT PRIMARY KEY,
  barkod TEXT NOT NULL UNIQUE,
  urun_adi TEXT NOT NULL,
  kategori TEXT,
  birim TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_urun_katalog_barkod ON urun_katalog (barkod);
