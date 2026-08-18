-- Stok takibi, ürünün kendi kaydına ait bir özellik olduğu için (Cari
-- Hesap'ın ayrı tablo olmasının aksine) doğrudan products tablosuna ekleniyor.
-- miktar/min_stok NULL olabilir - "bu ürün için stok takibi yapmıyorum"
-- anlamına gelir, Düşük Stok Uyarısı'nda görünmez.
ALTER TABLE products ADD COLUMN birim TEXT;
ALTER TABLE products ADD COLUMN miktar REAL;
ALTER TABLE products ADD COLUMN min_stok REAL;
