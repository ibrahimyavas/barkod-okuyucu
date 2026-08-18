import { useCallback, useEffect, useMemo, useState } from "react";
import { loadScans, saveScans } from "../lib/storage.js";

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Central store for the scanned-code list. Scanning the same code twice
// doesn't add a second row - it bumps that row's count. This makes the list
// double as an inventory count (scan an item 5 times -> count: 5) instead of
// just a log of raw reads.
export function useScanStore() {
  const [scans, setScans] = useState(() => loadScans());

  useEffect(() => {
    saveScans(scans);
  }, [scans]);

  // Returns "new" or "duplicate" (or null if the code was empty) so callers
  // can give different feedback for each.
  const addScan = useCallback((code, { format = "", source = "manual" } = {}) => {
    const value = String(code || "").trim();
    if (!value) return null;
    let outcome = "new";
    setScans((prev) => {
      const idx = prev.findIndex((s) => s.code === value);
      const now = Date.now();
      if (idx === -1) {
        return [
          { id: makeId(), code: value, format, source, count: 1, firstSeenAt: now, lastSeenAt: now },
          ...prev,
        ];
      }
      outcome = "duplicate";
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        count: next[idx].count + 1,
        lastSeenAt: now,
        format: format || next[idx].format,
      };
      return next;
    });
    return outcome;
  }, []);

  const removeScan = useCallback((id) => {
    setScans((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    if (!window.confirm("Tüm taranan kodlar silinsin mi? Bu işlem geri alınamaz.")) return;
    setScans([]);
  }, []);

  const totalCount = useMemo(() => scans.reduce((sum, s) => sum + s.count, 0), [scans]);

  return { scans, addScan, removeScan, clearAll, totalCount };
}
