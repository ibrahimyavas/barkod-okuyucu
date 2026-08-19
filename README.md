# Barkod Okuyucu

Tek şifreyle korunan, sekmeli bir küçük işletme uygulaması. Şu an içindeki
sekmeler:

- **Tarayıcı:** Kamera ve el terminali (USB/Bluetooth barkod tabancası) ile
  hızlı barkod okuma. Okunan her kod ekrandaki listeye eklenir; aynı kod
  tekrar okutulursa yeni satır açmaz, o satırın **adet**ini artırır (sayım
  için uygundur). Liste bu cihazda saklanır (localStorage) ve CSV olarak dışa
  aktarılabilir.
- **Ürün Girişi:** Ürün adı, kategori, depo/raf konumu, alınış tarihi,
  maliyet ile ürün kataloğu girişi - artık birim, mevcut stok ve min. stok
  seviyesi de dahil. Tarayıcı sekmesindeki bir satırdan 📦 ikonuna basarak o
  kodu doğrudan bu forma "aktarabilirsiniz". Tablodaki Stok/Min. sütunları
  tek tıkla düzenlenebilir (StockAdjuster - sayıyı yazıp ✓'a basmanız
  yeterli). Bu liste localStorage'da değil, Cloudflare D1'de tutulur - yani
  cihazlar arasında paylaşılır (bkz. aşağıdaki D1 kurulumu).
- **Satın Alma:** Tedarikçi dizini (ad, yetkili, telefon, adres) + satın alma
  kayıtları (ürün, miktar/birim, birim fiyat, toplam tutar - miktar ve birim
  fiyat girilince otomatik hesaplanır, elle de değiştirilebilir). Ödeme
  durumu rozetine tıklayınca Beklemede → Kısmi → Ödendi sırayla döner. Üstte
  toplam satın alma ve bekleyen ödeme tutarı özetlenir.
- **Cari Hesap:** Müşteri/tedarikçi/diğer taraflar için bakiye takibi.
  Standart cari hesap ekstresi mantığı: her hesabın bakiyesi
  Σ(Borç) − Σ(Alacak) olarak hareketlerden hesaplanır (ayrı bir bakiye
  kolonu tutulmaz, tutarsızlık riski yok) - pozitif bakiye "cari size
  borçlu", negatif bakiye "siz cariye borçlusunuz" demektir. Bir hesaba
  tıklayınca hareket geçmişi ve yeni Borç/Alacak ekleme formu açılır.
  Satın Alma'daki tedarikçi listesinden **bilinçli olarak ayrı** - bu modül
  kendi başına, bağımsız bir dashboard.
- **Düşük Stok:** Ürün Girişi'nde hem mevcut stok hem min. stok seviyesi
  tanımlanmış ürünlerden, stoğu eşiğin altına/eşitine düşenleri listeler
  (ikisinden biri boşsa - "stok takibi yapmıyorum" demektir - o ürün hiç
  görünmez). En kritik ürün en üstte; buradan da stoğu doğrudan
  güncelleyebilirsiniz.
- **Etiket Bas:** Ürün Girişi'nden bir ürün seçip (ya da elle kod girip)
  barkod/QR etiketi üretir - EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39,
  ITF, Codabar, QR Kod destekleniyor (`jsbarcode` + `qrcode`, tamamen
  istemci tarafında, backend'e gerek yok). Birden fazla ürünü kuyruğa
  ekleyip (her biri için ayrı adet belirleyip) tek seferde `window.print()`
  ile yazdırabilirsiniz - yazdırma sayfası sadece etiketleri gösterecek
  şekilde özel bir `@media print` düzeniyle hazırlanıyor. Kuyruk
  localStorage'da tutulur (yazdırma fiziksel/tek cihaza özel bir eylem
  olduğu için D1'e taşınmadı).
- **Rapor:** Ürün Girişi + Satın Alma + Cari Hesap verilerinden özet KPI'lar
  (stok değeri, kritik stok, bu ay satın alma, toplam alacak/borç) ve dört
  grafik: kategoriye göre ürün sayısı, aylık satın alma harcaması (son 6 ay),
  ödeme durumuna göre tutar dağılımı, en yüksek bakiyeli cariler. Yeni
  backend/D1 gerekmedi - hepsi mevcut uçlardan istemci tarafında
  hesaplanıyor. Her grafik kartında bir "tablo olarak göster" düğmesi var
  (erişilebilirlik - hiçbir veri sadece grafiğe hapsolmuyor).
- **Fatura:** Fatura ya da irsaliye kesme - Cari Hesap'tan muhatap seçip (ya
  da elle girip), Ürün Girişi'nden kalem seçip (ya da elle girip) belge
  oluşturur ve `window.print()` ile yazdırır. Evrak numaraları (`FTR-0001`,
  `IRS-0001`...) fatura/irsaliye için ayrı sayaçlarla, D1'de atomik olarak
  (`UPDATE ... RETURNING`) üretilir - reddedilen bir gönderim numara
  harcamaz. Fatura'da (irsaliye'de değil) KDV oranı girip "tutarı bu cari
  hesaba borç olarak işle" seçeneğiyle Cari Hesap'a otomatik borç kaydı
  düşülebilir. Firma bilgileri (ad/adres/telefon/vergi no) ayarlar
  panelinden bir kez girilir, her belgede kullanılır. Geçmiş bölümünden
  eski belgeler yeniden yazdırılabilir - Satın Alma/Cari Hesap gibi D1'de
  kalıcı, Etiket Bas'ın aksine. (Not: bir faturayı silmek, o faturayla
  cari hesaba işlenmiş borç kaydını otomatik geri almaz - gerekirse Cari
  Hesap'tan elle düzeltin.)

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

## Etiket boyutunu değiştirmek

Etiketler şu an 60mm × 35mm sabit boyutta (`src/index.css`'teki `@media
print .label-card` kuralı). Farklı bir etiket kağıdınız/yazıcınız varsa bu
`width`/`height` değerlerini kendi etiketinizin ölçüsüne göre değiştirin;
tarayıcının yazdırma diyaloğundaki ölçek/kenar boşluğu ayarları da işe
yarar.

## `barcode-detector`'ı güncellerken

`package.json`'daki `zxing-wasm` sürümü, `barcode-detector`'ın kendi
`node_modules/barcode-detector/package.json` içinde beyan ettiği `zxing-wasm`
sürümüyle **aynı** kalmalı (WASM dosyasını doğrudan o pakete işaret ederek
yerelden sunuyoruz - bkz. `src/lib/barcodeDetector.js`). `barcode-detector`'ı
güncellediğinizde bu ikisinin senkron kalıp kalmadığını kontrol edin.
