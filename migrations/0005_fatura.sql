-- Firma bilgileri + evrak numarası sayaçları. Tek satırlık ayar tablosu
-- (id sabit 1) - CHECK ile ikinci satır açılması engelleniyor.
CREATE TABLE fatura_ayarlari (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  firma_adi TEXT,
  firma_adres TEXT,
  firma_telefon TEXT,
  firma_vergi_no TEXT,
  sonraki_fatura_no INTEGER NOT NULL DEFAULT 1,
  sonraki_irsaliye_no INTEGER NOT NULL DEFAULT 1
);

INSERT INTO fatura_ayarlari (id) VALUES (1);

-- Kesilen fatura/irsaliyeler - kalıcı kayıt (Satın Alma/Cari Hesap gibi,
-- Etiket Bas'ın aksine: bunlar gerçek iş belgeleri, yeniden yazdırılabilir
-- olmalı). Kalemler tek bir belge olarak birlikte okunup yazıldığı için
-- ayrı bir tabloya değil, JSON metin olarak saklanıyor.
CREATE TABLE faturalar (
  id TEXT PRIMARY KEY,
  tur TEXT NOT NULL, -- 'fatura' | 'irsaliye'
  evrak_no TEXT NOT NULL,
  tarih TEXT,
  cari_id TEXT,
  muhatap_adi TEXT NOT NULL,
  muhatap_adres TEXT,
  muhatap_telefon TEXT,
  kalemler TEXT NOT NULL, -- JSON: [{urunAdi, miktar, birim, birimFiyat, tutar}]
  ara_toplam REAL,
  kdv_orani REAL,
  kdv_tutari REAL,
  genel_toplam REAL,
  not_metni TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_faturalar_created_at ON faturalar (created_at);
CREATE INDEX idx_faturalar_cari ON faturalar (cari_id);
