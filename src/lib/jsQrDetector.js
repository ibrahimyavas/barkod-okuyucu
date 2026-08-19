// QR moduna özel hafif dedektör: zxing-wasm yerine jsQR kullanır.
//
// Neden: QR modu her zaman zxing-wasm'ı zorluyordu (native'in QR desteği
// güvenilmez çıktığı için), ama zxing her karede tryHarder/tryRotate/
// tryInvert/tryDownscale ile birden fazla deneme yapıyor - bu, tek bir
// dekode denemesi yapan jsQR'a göre çok daha ağır. Ayrıca zxing-wasm'ın
// ~1MB'lık WASM ikili dosyası her QR moduna girişte indirilip başlatılıyor;
// jsQR saf JS olduğu için bu başlatma gecikmesi de yok. Sonuç: hem QR
// moduna girişte hem kare başına belirgin şekilde daha hızlı.
//
// Bedeli: jsQR zxing kadar "agresif" değil (aşırı bozuk/eğik kodlarda daha
// az toleranslı olabilir) - ama QR modu zaten kendi kırpma + düşük ışık
// güçlendirme + otomatik fener desteğiyle geliyor (bkz. useCameraScanner.js),
// bu da jsQR'ın tipik kullanım senaryosunda (kendi bastığımız güzergah
// etiketleri + normal kartlar) yeterince güvenilir olmasını sağlıyor.
import jsQR from "jsqr";

export class JsQrDetector {
  // formats parametresi yalnızca mevcut detect() arayüzüyle (Impl'ler
  // { formats } alan bir constructor bekliyor) uyum için kabul ediliyor -
  // bu dedektör zaten yalnızca QR modunda kullanılıyor.
  constructor() {}

  async detect(source) {
    // QR modunda getDetectSource() her zaman kırpılmış bir <canvas>
    // döndürür (cropRegion her zaman set), o yüzden burada normalde hep
    // canvas geliyor. Yine de tam video (kırpma kapalıysa) gelirse diye
    // savunmacı bir fallback bırakıyoruz.
    let canvas = source;
    if (!(source instanceof HTMLCanvasElement)) {
      const video = source;
      if (!video.videoWidth) return [];
      canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d", { willReadFrequently: true }).drawImage(video, 0, 0);
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!canvas.width || !canvas.height) return [];
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    if (!result || !result.data) return [];

    const loc = result.location;
    return [
      {
        rawValue: result.data,
        format: "qr_code",
        cornerPoints: [loc.topLeftCorner, loc.topRightCorner, loc.bottomRightCorner, loc.bottomLeftCorner],
      },
    ];
  }
}
