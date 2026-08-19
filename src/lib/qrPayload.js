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
