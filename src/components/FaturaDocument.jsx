import { trDate, fmtCurrency } from "../lib/format.js";

// The actual printable page - used both for the live preview before saving
// and, inside .print-area, for the real print/reprint. İrsaliye
// (delivery note) conventionally carries no pricing in Turkish practice, so
// the price/total columns only render for Fatura.
export default function FaturaDocument({ doc, settings }) {
  const isFatura = doc.tur === "fatura";

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
          <div className="fatura-title">{isFatura ? "FATURA" : "İRSALİYE"}</div>
          <div>Evrak No: {doc.evrakNo || "—"}</div>
          <div>Tarih: {trDate(doc.tarih)}</div>
        </div>
      </div>

      <div className="fatura-muhatap">
        <div className="fatura-muhatap-label">Sayın:</div>
        <div className="fatura-muhatap-adi">{doc.muhatapAdi || "—"}</div>
        {doc.muhatapAdres && <div>{doc.muhatapAdres}</div>}
        {doc.muhatapTelefon && <div>{doc.muhatapTelefon}</div>}
      </div>

      <table className="fatura-table">
        <thead>
          <tr>
            <th>Ürün</th>
            <th>Miktar</th>
            {isFatura && <th>Birim Fiyat</th>}
            {isFatura && <th>Tutar</th>}
          </tr>
        </thead>
        <tbody>
          {doc.kalemler.map((k, i) => (
            <tr key={i}>
              <td>{k.urunAdi}</td>
              <td>
                {k.miktar} {k.birim}
              </td>
              {isFatura && <td>{fmtCurrency(k.birimFiyat)}</td>}
              {isFatura && <td>{fmtCurrency(k.tutar)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {isFatura && (
        <div className="fatura-totals">
          <div>
            <span>Ara Toplam</span>
            <span>{fmtCurrency(doc.araToplam)}</span>
          </div>
          <div>
            <span>KDV (%{doc.kdvOrani || 0})</span>
            <span>{fmtCurrency(doc.kdvTutari)}</span>
          </div>
          <div className="fatura-genel-toplam">
            <span>Genel Toplam</span>
            <span>{fmtCurrency(doc.genelToplam)}</span>
          </div>
        </div>
      )}

      {doc.notMetni && <div className="fatura-not">{doc.notMetni}</div>}
    </div>
  );
}
