# Barkod Okuyucu

Tek şifreyle korunan, sekmeli bir küçük işletme uygulaması. Şu an içindeki
sekmeler:

- **Tarayıcı:** Kamera ve el terminali (USB/Bluetooth barkod tabancası) ile
  hızlı barkod okuma. Okunan her kod ekrandaki listeye eklenir; aynı kod
  tekrar okutulursa yeni satır açmaz, o satırın **adet**ini artırır (sayım
  için uygundur). Liste bu cihazda saklanır (localStorage) ve CSV olarak dışa
  aktarılabilir.
- **Ürün Girişi:** Ürün adı, kategori, depo/raf konumu, alınış tarihi ve
  maliyet ile ürün kataloğu girişi. Tarayıcı sekmesindeki bir satırdan
  📦 ikonuna basarak o kodu doğrudan bu forma "aktarabilirsiniz". Bu liste
  localStorage'da değil, Cloudflare D1'de tutulur - yani cihazlar arasında
  paylaşılır (bkz. aşağıdaki D1 kurulumu).
- **Satın Alma:** Tedarikçi dizini (ad, yetkili, telefon, adres) + satın alma
  kayıtları (ürün, miktar/birim, birim fiyat, toplam tutar - miktar ve birim
  fiyat girilince otomatik hesaplanır, elle de değiştirilebilir). Ödeme
  durumu rozetine tıklayınca Beklemede → Kısmi → Ödendi sırayla döner. Üstte
  toplam satın alma ve bekleyen ödeme tutarı özetlenir.

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
```

### İlk kurulumda: D1 veritabanı

"Ürün Girişi" ve sonraki dashboard'lar bir Cloudflare D1 veritabanı
gerektirir. Bir kere:

```bash
npx wrangler login                          # Cloudflare hesabınızla yetkilendirin
npx wrangler d1 create barkod-okuyucu-db    # gerçek bir database_id döndürür
```

Dönen `database_id`'yi `wrangler.jsonc` içindeki `d1_databases[0].database_id`
alanına yapıştırın (şu an placeholder bir UUID duruyor). Sonra şemayı
uygulayın:

```bash
npm run db:migrate:local    # yerel geliştirme veritabanı (sqlite, .wrangler/state altında)
npm run db:migrate:remote   # gerçek/uzak D1 - deploy'dan önce bir kere şart
```

`db:migrate:local`, `database_id` hâlâ placeholder olsa bile çalışır -
`--local` hiçbir zaman gerçek Cloudflare API'sine dokunmaz. `--remote` için
ise gerçek ID ve `wrangler login` şart.

### İlk kurulumda: giriş şifresi

Tüm uygulama (Tarayıcı sekmesi dahil) tek bir paylaşılan şifreyle korunur.
Oturumlar imzalı bir çerezle tutulur (D1'de tablo yok - `worker/auth.js`).

**Yerel geliştirme:**

```bash
cp .dev.vars.example .dev.vars
# .dev.vars içindeki AUTH_PASSWORD ve SESSION_SECRET'i düzenleyin
```

`.dev.vars` gitignore'da - asla commit'lenmez. `AUTH_PASSWORD` tanımlı
değilse giriş her zaman "Sunucuda AUTH_PASSWORD tanımlı değil" hatası verir
(şifresiz sızma yerine güvenli varsayılan).

**Prod (deploy'dan önce bir kere):**

```bash
npx wrangler secret put AUTH_PASSWORD
npx wrangler secret put SESSION_SECRET   # örn. `openssl rand -base64 32` çıktısı
```

Şifreyi değiştirmek isterseniz `wrangler secret put AUTH_PASSWORD`'ı tekrar
çalıştırmanız yeterli - mevcut oturumlar `SESSION_SECRET` değişmediği sürece
geçerli kalmaya devam eder (yani sadece şifreyi değiştirmek var olan
girişleri düşürmez; herkesi anında çıkışa zorlamak isterseniz
`SESSION_SECRET`'i de değiştirin).

### Geliştirme

İki süreç birlikte çalışır - biri React arayüzünü Vite ile (HMR'lı) sunar,
diğeri `/api/*` uçlarını gerçek Worker + D1 ile:

```bash
npm run worker:dev   # 1. terminal - Worker + D1, :8787
npm run dev           # 2. terminal - Vite dev server, :5174 (/api isteklerini :8787'ye proxy'ler)
```

Tarayıcıda `http://localhost:5174` adresini açın.

Sadece tarayıcı sekmesiyle uğraşıyorsanız (kamera/el terminali), `worker:dev`
olmadan da `npm run dev` tek başına çalışır - Ürün Girişi sekmesi o durumda
"sunucuya ulaşılamadı" hatası verir, bu normaldir.

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

`worker/index.js`, statik SPA'yı (`dist/`) ve `/api/*` uçlarını (D1 üzerinden
ürün girişi) aynı Worker'dan sunar - ayrı bir Cloudflare Pages projesine
gerek yok. Deploy'dan önce D1'in **uzak** (remote) tarafının şemasının güncel
olduğundan emin olun:

```bash
npm run db:migrate:remote   # remote D1 şemasını günceller (yeni migration eklediyseniz)
npm run deploy                # vite build + wrangler deploy
```

Uçtan uca (Worker + D1 + build edilmiş statik dosyalar, tek komutla, gerçek
Cloudflare ortamına en yakın haliyle) yerelde test etmek için:

```bash
npm run cf:dev
```

Tarayıcı sekmesindeki liste (localStorage) hâlâ cihaza özeldir ve
senkronize olmaz - bu bilinçli bir tercih (bkz. yukarıdaki "Nasıl çalışır").
Ürün Girişi listesi ise D1'de olduğu için tüm cihazlar/kullanıcılar aynı
veriyi görür.

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
