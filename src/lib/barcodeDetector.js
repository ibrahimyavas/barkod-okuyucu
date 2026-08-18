// Prefer the browser's native BarcodeDetector (hardware-accelerated where the
// platform provides one, e.g. Chrome/Android via Google Play Services) and
// fall back to the ZXing-wasm ponyfill from the `barcode-detector` package
// for browsers that don't implement the API yet (Safari, Firefox). Same
// interface either way, so the rest of the app doesn't need to care which
// one it got.
import { BarcodeDetector as PonyfillBarcodeDetector } from "barcode-detector/pure";

const NativeImpl = typeof window !== "undefined" ? window.BarcodeDetector : undefined;

export const BarcodeDetectorImpl = NativeImpl || PonyfillBarcodeDetector;
export const usingNativeDetector = Boolean(NativeImpl);

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
