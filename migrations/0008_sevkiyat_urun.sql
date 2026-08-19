-- Sevkiyat kayıtlarına ürün kimliği eklendi (barkod + ad) - artık Ürün
-- Listesi kataloğu (bkz. 0007_urun_katalog.sql) sayesinde barkod okutulunca
-- ad otomatik geldiği için bu alanları da tutmak ucuzlaştı, ve bir
-- sevkiyatın NEYİ taşıdığını görmek Lojistik için gerçek bir ihtiyaç.
ALTER TABLE sevkiyatlar ADD COLUMN barkod TEXT;
ALTER TABLE sevkiyatlar ADD COLUMN urun_adi TEXT;
