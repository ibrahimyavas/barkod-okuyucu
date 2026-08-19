import { trDate, fmtCurrency } from "../lib/format.js";

const TITLE = { fatura: "FATURA", irsaliye: "İRSALİYE", fis: "SATIŞ FİŞİ" };
const ODEME_LABEL = { nakit: "Nakit", kart: "Kart" };

// The actual printable page - used both for the live preview before saving
// and, inside .print-area, for the real print/reprint. İrsaliye (delivery
// note) conventionally carries no pricing in Turkish practice, so the
// price/total columns only render for Fatura/Fiş. Fiş'te (Satış/POS) her
// kalemin kendi vergi oranı olabileceği için (bkz. worker/fatura.js) tek bir
// üst seviye "KDV (%X)" yerine sadece toplam KDV tutarı gösteriliyor.
export default function FaturaDocument({ doc, settings }) {
  const showTotals = doc.tur === "fatura" || doc.tur === "fis";
  const isFis = doc.tur === "fis";

  return (
    <div className="fatura-page">
      <div className="fatura-head">
        <div className="fatura-firma">
          <div className="fatura-firma-adi">{settings?.firmaAdi || "Firma adı (Ayarlar'dan girin)"}</div>
          {settings?.firmaAdres && <div>{settings.firmaAdres}</div>}
          {settings?.firmaTelefon && <div>{settings.firmaTelefon}</div>}
          {settings?.firmaVergiNo && <div>Vergi No: {settings.firmaVergiNo}</div>}
        </div>
        <div className="fatura-meta">
          <div className="fatura-title">{TITLE[doc.tur] || "BELGE"}</div>
          <div>Evrak No: {doc.evrakNo || "—"}</div>
          <div>Tarih: {trDate(doc.tarih)}</div>
          {isFis && doc.odemeYontemi && <div>Ödeme: {ODEME_LABEL[doc.odemeYontemi] || doc.odemeYontemi}</div>}
        </div>
      </div>

      {!isFis && (
        <div className="fatura-muhatap">
          <div className="fatura-muhatap-label">Sayın:</div>
          <div className="fatura-muhatap-adi">{doc.muhatapAdi || "—"}</div>
          {doc.muhatapAdres && <div>{doc.muhatapAdres}</div>}
          {doc.muhatapTelefon && <div>{doc.muhatapTelefon}</div>}
        </div>
      )}

      <table className="fatura-table">
        <thead>
          <tr>
            <th>Ürün</th>
            <th>Miktar</th>
            {showTotals && <th>Birim Fiyat</th>}
            {showTotals && <th>Tutar</th>}
          </tr>
        </thead>
        <tbody>
          {doc.kalemler.map((k, i) => (
            <tr key={i}>
              <td>{k.urunAdi}</td>
              <td>
                {k.miktar} {k.birim}
              </td>
              {showTotals && <td>{fmtCurrency(k.birimFiyat)}</td>}
              {showTotals && <td>{fmtCurrency(isFis ? k.miktar * k.birimFiyat : k.tutar)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {showTotals && (
        <div className="fatura-totals">
          <div>
            <span>Ara Toplam</span>
            <span>{fmtCurrency(doc.araToplam)}</span>
          </div>
          <div>
            <span>{isFis ? "KDV" : `KDV (%${doc.kdvOrani || 0})`}</span>
            <span>{fmtCurrency(doc.kdvTutari)}</span>
          </div>
          <div className="fatura-genel-toplam">
            <span>{isFis ? "Ödenecek Tutar" : "Genel Toplam"}</span>
            <span>{fmtCurrency(doc.genelToplam)}</span>
          </div>
        </div>
      )}

      {doc.notMetni && <div className="fatura-not">{doc.notMetni}</div>}
    </div>
  );
}
