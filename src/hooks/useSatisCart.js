import { useCallback, useEffect, useState } from "react";

// Satış (POS) ekranının sepeti - localStorage'da (useLabelQueue ile aynı
// desen): kasiyer bir satış ortasında sekmeyi/sayfayı kapatırsa sepet
// kaybolmasın diye. Ödeme tamamlanınca (bkz. SatisDashboard.jsx) temizlenir.
const KEY = "barkod:satisSepeti:v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // depolama yoksa - sepet yalnızca bu oturumda kalır
  }
}

export function useSatisCart() {
  const [items, setItems] = useState(() => load());

  useEffect(() => {
    save(items);
  }, [items]);

  // Aynı barkod tekrar okutulursa satırı tekrarlamak yerine adedi artırır -
  // Tarayıcı'daki useScanStore ile aynı davranış.
  const addLine = useCallback((line) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.barkod === line.barkod);
      if (idx === -1) return [{ ...line, adet: 1 }, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], adet: next[idx].adet + 1 };
      return next;
    });
  }, []);

  const updateQty = useCallback((barkod, adet) => {
    setItems((prev) => prev.map((it) => (it.barkod === barkod ? { ...it, adet: Math.max(1, adet) } : it)));
  }, []);

  const removeLine = useCallback((barkod) => {
    setItems((prev) => prev.filter((it) => it.barkod !== barkod));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  return { items, addLine, updateQty, removeLine, clearCart };
}
