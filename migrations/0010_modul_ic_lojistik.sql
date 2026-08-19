-- Modül görünürlüğü: admin (Ayarlar ekranından) hangi sekmelerin
-- menüde görüneceğini seçebiliyor. Bir modül için satır yoksa VARSAYILAN
-- AKTİF kabul edilir - yalnızca kapatılan modüller burada satır olarak
-- tutulur (bkz. worker/modulAyarlari.js).
CREATE TABLE modul_ayarlari (
  modul_id TEXT PRIMARY KEY,
  aktif INTEGER NOT NULL DEFAULT 1
);

-- Şirket İçi Lojistik: mevcut "Lojistik" (sevkiyatlar) dış taraflara
-- (müşteri/tedarikçi) giden/gelen sevkiyatlar için - bu tablo ise şirket
-- İÇİNDEKİ depo/raf arası ürün hareketleri için. Taraf/cari/araç plakası
-- yok, yalnızca "hangi üründen ne kadarı nereden nereye taşındı".
CREATE TABLE depo_transferleri (
  id TEXT PRIMARY KEY,
  barkod TEXT,
  urun_adi TEXT,
  miktar REAL,
  birim TEXT,
  kaynak_konum TEXT,
  hedef_konum TEXT,
  tarih TEXT,
  durum TEXT NOT NULL DEFAULT 'planlandi', -- 'planlandi' | 'tamamlandi'
  not_metni TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_depo_transferleri_tarih ON depo_transferleri (tarih);
