-- Satın Alma'ya vergi oranı eklendi - Muhasebe ekranının "satın alımlarda
-- ödediğimiz KDV" hesabı buradan besleniyor (toplam_tutar vergi dahil
-- kabul edilip, vergi_orani ile içindeki KDV ayrıştırılıyor - Satış
-- fişlerindeki aynı mantık, bkz. worker/fatura.js).
ALTER TABLE purchases ADD COLUMN vergi_orani REAL;
