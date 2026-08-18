-- Ürün girişi kayıtları. Barkod tarayıcısındaki listeyle gevşek bağlı: bir
-- kod buraya "aktarılırken" kopyalanır, aralarında canlı bir referans yok.
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  barkod TEXT,
  urun_adi TEXT NOT NULL,
  kategori TEXT,
  depo_konumu TEXT,
  alinis_tarihi TEXT,
  maliyet REAL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_products_barkod ON products (barkod);
CREATE INDEX idx_products_created_at ON products (created_at);
