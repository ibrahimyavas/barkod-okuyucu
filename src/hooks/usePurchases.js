import { useCallback, useEffect, useState } from "react";
import { fetchPurchases, createPurchase, updatePurchaseStatus, deletePurchase } from "../lib/api.js";

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
        await updatePurchaseStatus(id, nextStatus);
      } catch (err) {
        setError(err.message);
        setPurchases(prev);
      }
    },
    [purchases]
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

  return { purchases, loading, error, addPurchase, cycleStatus, removePurchase };
}
