import { useCallback, useEffect, useState } from "react";
import { fetchUrunKatalog, createUrunKatalog, updateUrunKatalog, deleteUrunKatalog } from "../lib/api.js";

// Barkod <-> ürün kimliği kataloğu - Ürün Girişi, Satın Alma ve Lojistik
// formlarının barkod alanı doldurulduğunda ad/kategori/birim'i otomatik
// getirmesi için App.jsx'te tek bir yerden çağrılıp prop olarak dağıtılıyor
// (aynı useProducts deseni, bkz. App.jsx).
export function useUrunKatalog(enabled = true) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCatalog(await fetchUrunKatalog());
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

  const addEntry = useCallback(
    async (item) => {
      await createUrunKatalog(item);
      await reload();
    },
    [reload]
  );

  const updateEntry = useCallback(
    async (id, fields) => {
      const prev = catalog;
      setCatalog((cur) => cur.map((c) => (c.id === id ? { ...c, ...fields } : c))); // optimistic
      try {
        await updateUrunKatalog(id, fields);
      } catch (err) {
        setError(err.message);
        setCatalog(prev);
        throw err;
      }
    },
    [catalog]
  );

  const removeEntry = useCallback(
    async (id) => {
      const prev = catalog;
      setCatalog((cur) => cur.filter((c) => c.id !== id)); // optimistic
      try {
        await deleteUrunKatalog(id);
      } catch (err) {
        setError(err.message);
        setCatalog(prev);
      }
    },
    [catalog]
  );

  return { catalog, loading, error, addEntry, updateEntry, removeEntry };
}
