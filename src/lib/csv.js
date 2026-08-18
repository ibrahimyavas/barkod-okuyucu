export function sourceLabel(source) {
  if (source === "camera") return "Kamera";
  if (source === "gadget") return "El Terminali";
  return "Manuel";
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Semicolon-delimited - this is what Turkish-locale Excel expects when it
// auto-opens a .csv (it treats `,` as a decimal separator).
export function scansToCSV(scans) {
  const header = ["Kod", "Format", "Kaynak", "Adet", "Ilk Okunma", "Son Okunma"];
  const lines = [header.join(";")];
  for (const s of scans) {
    lines.push(
      [
        csvEscape(s.code),
        csvEscape(s.format || ""),
        csvEscape(sourceLabel(s.source)),
        s.count,
        new Date(s.firstSeenAt).toLocaleString("tr-TR"),
        new Date(s.lastSeenAt).toLocaleString("tr-TR"),
      ].join(";")
    );
  }
  return lines.join("\r\n");
}

export function downloadTextFile(filename, text, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿" + text], { type: mime }); // BOM so Excel picks up UTF-8 (ç, ş, ı, ...)
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
