import { useCallback, useEffect, useState } from "react";
import { fetchFaturalar, createFatura, deleteFatura } from "../lib/api.js";

export function useFaturalar() {
  const [faturalar, setFaturalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFaturalar(await fetchFaturalar());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addFatura = useCallback(
    async (fatura) => {
      const result = await createFatura(fatura);
      await reload();
      return result; // { id, evrakNo, ... } - caller needs evrakNo right away for print
    },
    [reload]
  );

  const removeFatura = useCallback(
    async (id) => {
      const prev = faturalar;
      setFaturalar((cur) => cur.filter((f) => f.id !== id)); // optimistic
      try {
        await deleteFatura(id);
      } catch (err) {
        setError(err.message);
        setFaturalar(prev);
      }
    },
    [faturalar]
  );

  return { faturalar, loading, error, addFatura, removeFatura };
}
