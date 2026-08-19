-- Müşteriler (satış tarafı) - Satın Alma'daki suppliers (tedarikçi, alış
-- tarafı) ile aynı şekil, bilinçli olarak ayrı tablo. İkisi de artık kendi
-- ayrı ekranlarında tanımlanıyor (Tedarikçiler / Müşteriler) ve Satış,
-- Fatura, Lojistik gibi diğer ekranlarda "satış" ya da "alış" olarak
-- işaretlenen yerlerde seçenek olarak otomatik geliyor.
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  ad TEXT NOT NULL,
  yetkili TEXT,
  telefon TEXT,
  adres TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_customers_ad ON customers (ad);
