import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { fmtCurrency } from "../lib/format.js";

// Our format ids (shared with the scanner - see lib/barcodeDetector.js) to
// the format strings JsBarcode actually expects.
const JSBARCODE_FORMAT = {
  ean_13: "EAN13",
  ean_8: "EAN8",
  upc_a: "UPC",
  upc_e: "UPCE",
  code_128: "CODE128",
  code_39: "CODE39",
  itf: "ITF",
  codabar: "CODABAR",
};

// Renders one printable label: barcode/QR + optional product name + price.
// Used both for the live preview while filling out the form and, many times
// over, inside the print sheet.
//
// `qrPayload` (QR only): when set, this is what actually gets encoded into
// the QR instead of the plain `barkod` - see lib/qrPayload.js. `nereden`/
// `nereye` are shown as visible text on the label too, so a human glancing
// at it sees the route without needing to scan anything.
export default function BarcodeLabel({ barkod, urunAdi, fiyat, format, qrPayload, nereden, nereye }) {
  const svgRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    if (!barkod) return;

    if (format === "qr_code") {
      if (!canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, qrPayload || barkod, { margin: 1, width: 90 }).catch((err) =>
        setError(err?.message || "QR kod üretilemedi.")
      );
      return;
    }

    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, barkod, {
        format: JSBARCODE_FORMAT[format] || "CODE128",
        width: 2,
        height: 45,
        displayValue: true,
        fontSize: 13,
        margin: 4,
      });
    } catch (err) {
      // Most common cause: the code's length/checksum doesn't fit the
      // chosen symbology (e.g. a 9-digit code picked as EAN-13).
      setError(err?.message || "Bu kod bu formatla üretilemedi.");
    }
  }, [barkod, format, qrPayload]);

  return (
    <div className="label-card">
      {urunAdi && <div className="label-title">{urunAdi}</div>}
      {error ? (
        <div className="label-error">{error}</div>
      ) : format === "qr_code" ? (
        <canvas ref={canvasRef} />
      ) : (
        <svg ref={svgRef} />
      )}
      {(nereden || nereye) && (
        <div className="label-route">
          {nereden || "?"} → {nereye || "?"}
        </div>
      )}
      {fiyat != null && fiyat !== "" && <div className="label-price">{fmtCurrency(fiyat)}</div>}
    </div>
  );
}
