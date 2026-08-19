// Prefer the browser's native BarcodeDetector (hardware-accelerated where the
// platform provides one) and fall back to the ZXing-wasm ponyfill from the
// `barcode-detector` package for browsers that don't implement the API.
//
// IMPORTANT gotcha this file works around: on several platforms (notably
// desktop Linux Chrome, and some ChromeOS builds) the *native* BarcodeDetector
// only actually implements QR codes - the constructor happily accepts
// `{ formats: ["ean_13", ...] }` without throwing, and `detect()` just always
// returns an empty array for those formats. You only find out by calling the
// static `BarcodeDetector.getSupportedFormats()` and checking the real list.
// That's exactly why "QR works, barcodes don't" happens with no error anywhere.
// So: we check native's *actual* supported formats before trusting it, and
// fall back to the WASM engine (which decodes every format itself, so it
// can't have this problem) whenever native falls short.
import { BarcodeDetector as PonyfillBarcodeDetector, setZXingModuleOverrides } from "barcode-detector/pure";
import zxingReaderWasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

// By default the WASM engine fetches its .wasm binary from the jsDelivr CDN
// on first use - an extra network hop (and a hard failure if that CDN is
// blocked/slow on the deploying network). Point it at the copy Vite already
// bundles alongside our own JS instead: same origin, no CDN dependency, and
// the browser can cache it like any other asset of ours.
setZXingModuleOverrides({ locateFile: (file) => (file.endsWith(".wasm") ? zxingReaderWasmUrl : file) });

const NativeImpl = typeof window !== "undefined" ? window.BarcodeDetector : undefined;

// Formats we actually expect to see on products/shipments. Keeping this list
// short (rather than "all formats") makes every detect() call faster, since
// the detector doesn't spend time trying to match symbologies we'll never
// scan. Add to this list if you start using a format that isn't here.
export const DEFAULT_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
  "codabar",
  "qr_code",
];

let cached; // { key, promise } - re-resolve only if the requested formats change

// Resolves which BarcodeDetector implementation to actually use for the
// given formats, verifying native support rather than assuming it. Returns
// { Impl, usingNative }. The result is memoized per formats list.
export function resolveBarcodeDetector(formats = DEFAULT_FORMATS) {
  const key = formats.join(",");
  if (cached?.key === key) return cached.promise;

  const promise = (async () => {
    if (NativeImpl) {
      try {
        const supported = await NativeImpl.getSupportedFormats();
        if (formats.every((f) => supported.includes(f))) {
          return { Impl: NativeImpl, usingNative: true };
        }
      } catch {
        // getSupportedFormats itself failing is as good as "not usable" - fall through.
      }
    }
    return { Impl: PonyfillBarcodeDetector, usingNative: false };
  })();

  cached = { key, promise };
  return promise;
}

// Formats for the Tarayıcı screen's dedicated "QR" mode.
export const QR_ONLY_FORMATS = ["qr_code"];

// getSupportedFormats() reporting "qr_code" doesn't guarantee the native
// implementation actually decodes QR reliably in practice - we've seen
// devices where it passes that check but real-world QR reads still fail
// while a software engine handles the exact same code fine. So QR mode
// never uses native, regardless of what it claims to support.
//
// It also doesn't use the zxing-wasm engine used elsewhere in this file:
// that engine's exhaustive tryHarder/tryRotate/tryInvert passes (plus its
// ~1MB WASM binary having to load and boot on first use) made QR mode
// noticeably slow in practice. A first attempt at a lighter pure-JS engine
// (jsQR directly) still wasn't reliable/fast enough, so QR mode now uses
// nimiq/qr-scanner - a mature, widely-used third-party project that wraps
// an optimized ZXing derivative and runs it in a Web Worker (keeps the
// main thread - camera preview, UI - unblocked). See
// lib/qrScannerDetector.js for the detailed reasoning and setup.
//
// Dynamically imported (rather than imported at the top of this file) so
// its code only downloads when someone actually switches to QR mode -
// barcode-only sessions (the common case) don't pay for it.
export async function resolveQrOnlyDetector() {
  const { QrScannerDetector } = await import("./qrScannerDetector.js");
  return { Impl: QrScannerDetector, usingNative: false };
}
