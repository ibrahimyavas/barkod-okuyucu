// Builds the human-readable, multi-line text embedded in a "route" QR label
// (product + where it's going from/to) - plain text so it reads fine in
// *any* QR scanner app, not just this one's dedicated QR mode.
export function buildRoutePayload({ urunAdi, barkod, nereden, nereye }) {
  const lines = [];
  if (urunAdi) lines.push(`Ürün: ${urunAdi}`);
  if (barkod) lines.push(`Kod: ${barkod}`);
  if (nereden) lines.push(`Nereden: ${nereden}`);
  if (nereye) lines.push(`Nereye: ${nereye}`);
  return lines.join("\n");
}

const LINE_PATTERNS = {
  urunAdi: /^Ürün:\s*(.+)$/,
  barkod: /^Kod:\s*(.+)$/,
  nereden: /^Nereden:\s*(.+)$/,
  nereye: /^Nereye:\s*(.+)$/,
};

// buildRoutePayload'ın tersi - Lojistik'in QR tarama modu, kendi
// bastığımız güzergah etiketlerini okuyunca sevkiyat formunu doldurmak için
// kullanıyor. Bizim formatımıza uymayan (satırların hiçbiri eşleşmeyen) bir
// QR/barkod içinse null döner - çağıran taraf o zaman ham kodu düz bir
// barkod gibi (kataloğa bakarak) ele alabilir.
export function parseRoutePayload(text) {
  if (!text) return null;
  const lines = String(text).split("\n");
  const result = {};
  for (const line of lines) {
    const trimmed = line.trim();
    for (const [key, re] of Object.entries(LINE_PATTERNS)) {
      const m = trimmed.match(re);
      if (m) result[key] = m[1].trim();
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

// "Canlı" güzergah QR'ı - buildRoutePayload gibi metni gömmek yerine sadece
// kaydın kimliğine (tur + id) işaret eder. Etiket bir kez basılır, sonra
// Lojistik/İç Lojistik'te kayıt güncellendikçe (nereye/durum değişince)
// AYNI QR okutulduğunda güncel bilgi görünür - çünkü okuma anında sunucudan
// o kaydın o anki hali çekiliyor (bkz. LojistikDashboard/IcLojistikDashboard
// handleQrDetect, lib/api.js fetchSevkiyat/fetchDepoTransfer).
export function buildRouteRef(tur, id) {
  return `ERPREF:${tur}:${id}`;
}

const ROUTE_REF_PATTERN = /^ERPREF:(sevk|transfer):(.+)$/;

export function parseRouteRef(text) {
  if (!text) return null;
  const m = String(text).trim().match(ROUTE_REF_PATTERN);
  if (!m) return null;
  return { tur: m[1], id: m[2] };
}
