import { trDate, fmtCurrency } from "../lib/format.js";

// Gün Sonu (X) / Z Raporu'nun yazdırılabilir hâli. Gerçek bir yazar kasanın
// Z raporu gibi günü fiilen "kapatmıyor" - sadece o günün fiş kayıtlarından
// (faturalar, tur='fis') aynı özeti hesaplayıp yazdırıyor. Fiziksel yazar
// kasanız varsa günü orada resmî olarak kapatmanız hâlâ gerekir - bkz.
// SatisDashboard.jsx üstündeki not.
export default function GunSonuRaporu({ ozet, tarih, settings, tur }) {
  return (
    <div className="fatura-page">
      <div className="fatura-head">
        <div className="fatura-firma">
          <div className="fatura-firma-adi">{settings?.firmaAdi || "Firma adı (Ayarlar'dan girin)"}</div>
          {settings?.firmaVergiNo && <div>Vergi No: {settings.firmaVergiNo}</div>}
        </div>
        <div className="fatura-meta">
          <div className="fatura-title">{tur === "z" ? "Z RAPORU" : "GÜN SONU (X) RAPORU"}</div>
          <div>Tarih: {trDate(tarih)}</div>
        </div>
      </div>

      <div className="fatura-totals">
        <div>
          <span>Fiş Sayısı</span>
          <span>{ozet.fisSayisi}</span>
        </div>
        <div>
          <span>Ara Toplam</span>
          <span>{fmtCurrency(ozet.araToplam)}</span>
        </div>
        <div>
          <span>KDV</span>
          <span>{fmtCurrency(ozet.kdv)}</span>
        </div>
        <div className="fatura-genel-toplam">
          <span>Genel Toplam</span>
          <span>{fmtCurrency(ozet.toplam)}</span>
        </div>
        <div>
          <span>Nakit</span>
          <span>{fmtCurrency(ozet.nakit)}</span>
        </div>
        <div>
          <span>Kart</span>
          <span>{fmtCurrency(ozet.kart)}</span>
        </div>
      </div>

      {tur === "z" && (
        <div className="fatura-not">
          Bu, yazılım tarafında tutulan satış kayıtlarının özetidir - resmî yazar kasa Z raporu yerine geçmez, fiziksel
          cihazda ayrıca gün sonu almanız gerekir.
        </div>
      )}
    </div>
  );
}
