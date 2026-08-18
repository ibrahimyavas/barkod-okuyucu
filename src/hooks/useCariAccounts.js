import { useCallback, useEffect, useState } from "react";
import { fetchCariAccounts, createCariAccount, deleteCariAccount } from "../lib/api.js";

// Balances come back computed from the movements table (see worker/cari.js)
// on every fetch - there's no stored balance to drift out of sync.
export function useCariAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAccounts(await fetchCariAccounts());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addAccount = useCallback(
    async (account) => {
      const { id } = await createCariAccount(account);
      await reload();
      return id;
    },
    [reload]
  );

  const removeAccount = useCallback(
    async (id) => {
      const prev = accounts;
      setAccounts((cur) => cur.filter((a) => a.id !== id)); // optimistic
      try {
        await deleteCariAccount(id);
      } catch (err) {
        setError(err.message);
        setAccounts(prev);
      }
    },
    [accounts]
  );

  return { accounts, loading, error, addAccount, removeAccount, reload };
}
