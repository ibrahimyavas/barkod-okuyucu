import { useCallback, useEffect, useState } from "react";
import { fetchSevkiyatlar, createSevkiyat, updateSevkiyat, deleteSevkiyat } from "../lib/api.js";

export function useSevkiyatlar() {
  const [sevkiyatlar, setSevkiyatlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSevkiyatlar(await fetchSevkiyatlar());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addSevkiyat = useCallback(
    async (sevkiyat) => {
      await createSevkiyat(sevkiyat);
      await reload();
    },
    [reload]
  );

  // Full reload rather than optimistic merge here - the server may derive
  // gerceklesenTarih (e.g. auto-filling "today" on teslim_edildi), so the
  // client's guess of the new row would be wrong until it re-fetches anyway.
  const updateOne = useCallback(
    async (id, fields) => {
      await updateSevkiyat(id, fields);
      await reload();
    },
    [reload]
  );

  const removeSevkiyat = useCallback(
    async (id) => {
      const prev = sevkiyatlar;
      setSevkiyatlar((cur) => cur.filter((s) => s.id !== id)); // optimistic
      try {
        await deleteSevkiyat(id);
      } catch (err) {
        setError(err.message);
        setSevkiyatlar(prev);
      }
    },
    [sevkiyatlar]
  );

  return { sevkiyatlar, loading, error, addSevkiyat, updateOne, removeSevkiyat };
}
