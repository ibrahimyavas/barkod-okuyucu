// Scanned-code list persistence. Everything lives in localStorage on this
// device/browser - there's no backend, so nothing syncs between devices yet.
// Use the CSV export (see csv.js) to move data out.
const KEY = "barkod:kayitlar:v1";

export function loadScans() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveScans(scans) {
  try {
    localStorage.setItem(KEY, JSON.stringify(scans));
  } catch {
    // Storage full or unavailable (e.g. private browsing) - not fatal.
  }
}
