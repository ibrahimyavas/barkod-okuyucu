import { useCallback, useEffect, useState } from "react";
import { fetchDepoTransferleri, createDepoTransfer, updateDepoTransfer, deleteDepoTransfer } from "../lib/api.js";

export function useDepoTransferleri() {
  const [transferler, setTransferler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTransferler(await fetchDepoTransferleri());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addTransfer = useCallback(
    async (transfer) => {
      await createDepoTransfer(transfer);
      await reload();
    },
    [reload]
  );

  const updateOne = useCallback(
    async (id, fields) => {
      const prev = transferler;
      setTransferler((cur) => cur.map((t) => (t.id === id ? { ...t, ...fields } : t))); // optimistic
      try {
        await updateDepoTransfer(id, fields);
      } catch (err) {
        setError(err.message);
        setTransferler(prev);
      }
    },
    [transferler]
  );

  const removeTransfer = useCallback(
    async (id) => {
      const prev = transferler;
      setTransferler((cur) => cur.filter((t) => t.id !== id)); // optimistic
      try {
        await deleteDepoTransfer(id);
      } catch (err) {
        setError(err.message);
        setTransferler(prev);
      }
    },
    [transferler]
  );

  return { transferler, loading, error, addTransfer, updateOne, removeTransfer };
}
