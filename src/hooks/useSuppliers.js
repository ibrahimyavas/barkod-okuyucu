import { useCallback, useEffect, useState } from "react";
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier } from "../lib/api.js";

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSuppliers(await fetchSuppliers());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addSupplier = useCallback(
    async (supplier) => {
      const { id } = await createSupplier(supplier);
      await reload();
      return id;
    },
    [reload]
  );

  const editSupplier = useCallback(
    async (id, fields) => {
      await updateSupplier(id, fields);
      await reload();
    },
    [reload]
  );

  const removeSupplier = useCallback(
    async (id) => {
      const prev = suppliers;
      setSuppliers((cur) => cur.filter((s) => s.id !== id)); // optimistic
      try {
        await deleteSupplier(id);
      } catch (err) {
        setError(err.message);
        setSuppliers(prev);
      }
    },
    [suppliers]
  );

  return { suppliers, loading, error, addSupplier, editSupplier, removeSupplier, reload };
}
