import { useCallback, useEffect, useState } from "react";
import { fetchSatisFiyatlari, createSatisFiyati, updateSatisFiyati, deleteSatisFiyati } from "../lib/api.js";

// Satış Fiyatları: stok (Ürün Girişi) ile Satış (POS) arasındaki ara katman
// - App.jsx'te tek yerden çağrılıp Satış Fiyatları ve Satış ekranlarına
// prop olarak veriliyor (useProducts/useUrunKatalog ile aynı desen).
export function useSatisFiyatlari(enabled = true) {
  const [fiyatlar, setFiyatlar] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFiyatlar(await fetchSatisFiyatlari());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reload]);

  const addFiyat = useCallback(
    async (item) => {
      await createSatisFiyati(item);
      await reload();
    },
    [reload]
  );

  const updateFiyat = useCallback(
    async (id, fields) => {
      const prev = fiyatlar;
      setFiyatlar((cur) => cur.map((f) => (f.id === id ? { ...f, ...fields } : f))); // optimistic
      try {
        await updateSatisFiyati(id, fields);
      } catch (err) {
        setError(err.message);
        setFiyatlar(prev);
        throw err;
      }
    },
    [fiyatlar]
  );

  const removeFiyat = useCallback(
    async (id) => {
      const prev = fiyatlar;
      setFiyatlar((cur) => cur.filter((f) => f.id !== id)); // optimistic
      try {
        await deleteSatisFiyati(id);
      } catch (err) {
        setError(err.message);
        setFiyatlar(prev);
      }
    },
    [fiyatlar]
  );

  return { fiyatlar, loading, error, addFiyat, updateFiyat, removeFiyat };
}
