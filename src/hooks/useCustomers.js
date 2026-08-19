import { useCallback, useEffect, useState } from "react";
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from "../lib/api.js";

// hooks/useSuppliers.js ile birebir aynı desen - müşteriler (satış tarafı).
export function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCustomers(await fetchCustomers());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addCustomer = useCallback(
    async (customer) => {
      const { id } = await createCustomer(customer);
      await reload();
      return id;
    },
    [reload]
  );

  const editCustomer = useCallback(
    async (id, fields) => {
      await updateCustomer(id, fields);
      await reload();
    },
    [reload]
  );

  const removeCustomer = useCallback(
    async (id) => {
      const prev = customers;
      setCustomers((cur) => cur.filter((c) => c.id !== id)); // optimistic
      try {
        await deleteCustomer(id);
      } catch (err) {
        setError(err.message);
        setCustomers(prev);
      }
    },
    [customers]
  );

  return { customers, loading, error, addCustomer, editCustomer, removeCustomer, reload };
}
