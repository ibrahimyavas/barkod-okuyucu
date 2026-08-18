-- Cari hesaplar (müşteri/tedarikçi/diğer olabilen taraflar) ve hareketleri.
-- Bilinçli olarak Satın Alma'daki `suppliers` tablosundan ayrı: bu modül
-- kendi başına çalışan bağımsız bir dashboard.
--
-- Bakiye saklanmıyor, hareketlerden toplanıyor (worker/cari.js'teki SUM
-- sorgusu) - tek doğruluk kaynağı hareket tablosu, tutarsızlık riski yok.
-- Kural: bakiye = Σ(borç) - Σ(alacak). Pozitif bakiye = cari bize borçlu;
-- negatif bakiye = biz cariye borçluyuz.
CREATE TABLE cari_hesaplar (
  id TEXT PRIMARY KEY,
  ad TEXT NOT NULL,
  tur TEXT NOT NULL DEFAULT 'musteri', -- 'musteri' | 'tedarikci' | 'diger'
  telefon TEXT,
  adres TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_cari_hesaplar_ad ON cari_hesaplar (ad);

CREATE TABLE cari_hareketler (
  id TEXT PRIMARY KEY,
  cari_id TEXT NOT NULL,
  tur TEXT NOT NULL, -- 'borc' | 'alacak'
  tutar REAL NOT NULL,
  aciklama TEXT,
  tarih TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_cari_hareketler_cari ON cari_hareketler (cari_id);
CREATE INDEX idx_cari_hareketler_created_at ON cari_hareketler (created_at);
