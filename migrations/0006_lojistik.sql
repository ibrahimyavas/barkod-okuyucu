-- Sevkiyat/teslimat takibi - giden (müşteriye) ve gelen (tedarikçiden)
-- sevkiyatlar aynı tabloda, `yon` ile ayrılıyor. cari_id gevşek referans
-- (diğer tablolardaki gibi) - taraf_adi anlık isim kopyası.
--
-- "Gecikti" ayrı bir durum değeri DEĞİL - planlanan_tarih geçmiş olup hâlâ
-- planlandi/yolda durumundaki kayıtlar için istemci tarafında hesaplanıyor
-- (bkz. src/lib/format.js isPastDate + LojistikDashboard.jsx). Böylece
-- kimse "gecikti" diye elle işaretlemeyi unutursa veri yanlış kalmaz.
CREATE TABLE sevkiyatlar (
  id TEXT PRIMARY KEY,
  yon TEXT NOT NULL DEFAULT 'giden', -- 'giden' | 'gelen'
  cari_id TEXT,
  taraf_adi TEXT NOT NULL,
  arac_plakasi TEXT,
  surucu TEXT,
  cikis_konumu TEXT,
  varis_konumu TEXT,
  planlanan_tarih TEXT,
  gerceklesen_tarih TEXT,
  durum TEXT NOT NULL DEFAULT 'planlandi', -- 'planlandi' | 'yolda' | 'teslim_edildi' | 'iptal'
  not_metni TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_sevkiyatlar_created_at ON sevkiyatlar (created_at);
CREATE INDEX idx_sevkiyatlar_durum ON sevkiyatlar (durum);
