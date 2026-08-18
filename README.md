# Barkod Okuyucu

Kamera ve el terminali (USB/Bluetooth barkod tabancası) ile hızlı barkod
okuma uygulaması. Okunan her kod ekrandaki listeye eklenir; aynı kod tekrar
okutulursa yeni satır açmaz, o satırın **adet**ini artırır (sayım için
uygundur). Liste bu cihazda saklanır (localStorage) ve CSV olarak dışa
aktarılabilir.

## Nasıl çalışır

- **Kamera:** Tarayıcının yerleşik `BarcodeDetector` API'si varsa *ve
  gerçekten istediğimiz tüm formatları destekliyorsa* onu kullanır — donanım
  hızlandırmalı, en hızlı seçenek. Bunu körü körüne varsaymıyoruz: bazı
  platformlarda (özellikle masaüstü Linux Chrome) yerleşik dedektör sessizce
  sadece QR destekler, `detect()` diğer formatlar için hep boş döner. Bu
  yüzden `BarcodeDetector.getSupportedFormats()` ile gerçek desteği kontrol
  ediyoruz; eksikse `barcode-detector` paketinin WASM (ZXing) tabanlı
  yazılımsal sürümüne otomatik geçiyoruz - bu motor kendi içinde tüm
  formatları decode ettiği için bu sorunu hiç yaşamıyor. WASM dosyası
  jsDelivr CDN yerine build'e gömülü olarak (`dist/assets/zxing_reader-*.wasm`)
  yerelden sunuluyor - ekstra ağ bağımlılığı ve CDN gecikmesi yok. Hangi
  motorun kullanıldığı sağ üstteki rozette görünür. Algılama her video
  karesinde `requestVideoFrameCallback` ile çalışır (en düşük gecikme); bu
  API yoksa ~15fps'lik zamanlayıcıya döner.
- **El terminali:** Çoğu el tipi barkod okuyucu USB/Bluetooth üzerinden
  klavye gibi görünür (HID) — kodu yazıp Enter basar. Uygulama, tuş
  vuruşları arasındaki süreye bakarak bunu insan yazımından ayırt eder
  (elektronik hız: tipik olarak <80ms/tuş); bunun için özel bir sürücüye ya
  da belirli bir kutunun odakta olmasına gerek yoktur. Cihazınız daha yavaş
  yazıyorsa araç çubuğundaki **"Yavaş cihaz"** kutusunu işaretleyin (eşiği
  250ms'ye çıkarır).
- **Manuel giriş:** Kamerayla okunamayan ya da elde bulunmayan kodlar için
  yedek metin kutusu.

## Kurulum

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:5174` adresini açın.

### Telefonla / kamerayla test

`getUserMedia` (kamera erişimi) yalnızca **güvenli bağlam**da (HTTPS veya
`localhost`) çalışır. Aynı Wi-Fi'deki bir telefondan `npm run dev`
sunucusuna düz `http://<lan-ip>:5174` ile bağlanırsanız çoğu mobil tarayıcı
kamerayı reddeder. Hızlı çözüm — geçici bir HTTPS tüneli açın:

```bash
npx localtunnel --port 5174
# veya: npx ngrok http 5174
```

verilen `https://...` adresini telefonda açın.

## Yayına alma — Cloudflare Workers

Bu bir statik React/Vite uygulaması; sunucu tarafı mantık yok, bu yüzden
Worker script'i değil, `wrangler.jsonc` içindeki `assets` yapılandırmasıyla
doğrudan `dist/`'i statik olarak Cloudflare'in edge ağından sunuyoruz (ayrı
bir Cloudflare Pages projesine gerek yok).

```bash
npx wrangler login   # tarayıcıda Cloudflare hesabınızla bir kere yetkilendirin
npm run deploy       # vite build + wrangler deploy
```

Yerelde workerd üzerinde (gerçek Cloudflare ortamına en yakın haliyle) test
etmek için:

```bash
npm run cf:dev
```

Şu an bir backend/veritabanı **yok** — liste her cihazda kendi
localStorage'ında tutulur ve cihazlar arasında senkronize olmaz. Cihazlar
arası paylaşım gerekirse (ör. birden çok kişi aynı listeye okutacaksa), bir
Cloudflare Worker + KV/D1 backend'i sonraki bir adımda eklenebilir.

## Barkod formatlarını değiştirmek

Taranan formatlar `src/lib/barcodeDetector.js` içindeki `DEFAULT_FORMATS`
listesinde. Liste kısa tutuldukça algılama daha hızlı çalışır; kullanmadığınız
formatları listeden çıkarmanız, yenilerini eklemekten daha çok hız kazandırır.

## `barcode-detector`'ı güncellerken

`package.json`'daki `zxing-wasm` sürümü, `barcode-detector`'ın kendi
`node_modules/barcode-detector/package.json` içinde beyan ettiği `zxing-wasm`
sürümüyle **aynı** kalmalı (WASM dosyasını doğrudan o pakete işaret ederek
yerelden sunuyoruz - bkz. `src/lib/barcodeDetector.js`). `barcode-detector`'ı
güncellediğinizde bu ikisinin senkron kalıp kalmadığını kontrol edin.
