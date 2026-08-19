import { useCallback, useEffect, useState } from "react";
import { fetchPurchases, createPurchase, updatePurchase, deletePurchase } from "../lib/api.js";

export function usePurchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPurchases(await fetchPurchases());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addPurchase = useCallback(
    async (purchase) => {
      await createPurchase(purchase);
      await reload();
    },
    [reload]
  );

  const cycleStatus = useCallback(
    async (id, nextStatus) => {
      const prev = purchases;
      setPurchases((cur) => cur.map((p) => (p.id === id ? { ...p, odemeDurumu: nextStatus } : p))); // optimistic
      try {
        await updatePurchase(id, { odemeDurumu: nextStatus });
      } catch (err) {
        setError(err.message);
        setPurchases(prev);
      }
    },
    [purchases]
  );

  // Full reload rather than optimistic merge - toplamTutar may be
  // recalculated server-side when miktar/birimFiyat change.
  const editPurchase = useCallback(
    async (id, fields) => {
      await updatePurchase(id, fields);
      await reload();
    },
    [reload]
  );

  const removePurchase = useCallback(
    async (id) => {
      const prev = purchases;
      setPurchases((cur) => cur.filter((p) => p.id !== id)); // optimistic
      try {
        await deletePurchase(id);
      } catch (err) {
        setError(err.message);
        setPurchases(prev);
      }
    },
    [purchases]
  );

  return { purchases, loading, error, addPurchase, cycleStatus, editPurchase, removePurchase };
}
