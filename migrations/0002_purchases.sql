-- Tedarikçi dizini.
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  ad TEXT NOT NULL,
  yetkili TEXT,
  telefon TEXT,
  adres TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_suppliers_ad ON suppliers (ad);

-- Satın alma kayıtları. supplier_id gevşek bir referans (products.barkod gibi
-- - FK constraint yok); tedarikci_adi o anki ismin bir kopyasını tutar ki
-- tedarikçi silinse/yeniden adlandırılsa bile geçmiş kayıt okunabilir kalsın
-- (Üretim/app'in satış tablosunda "Firma Kodu" + "Firma Adı"nı birlikte
-- tutması gibi).
CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  supplier_id TEXT,
  tedarikci_adi TEXT,
  urun_adi TEXT NOT NULL,
  barkod TEXT,
  miktar REAL,
  birim TEXT,
  birim_fiyat REAL,
  toplam_tutar REAL,
  odeme_durumu TEXT NOT NULL DEFAULT 'beklemede', -- 'odendi' | 'beklemede' | 'kismi'
  tarih TEXT,
  not_metni TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_purchases_supplier ON purchases (supplier_id);
CREATE INDEX idx_purchases_created_at ON purchases (created_at);
