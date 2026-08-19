import { useCallback, useEffect, useState } from "react";
import { fetchCariMovements, createCariMovement, updateCariMovement, deleteCariMovement } from "../lib/api.js";

// `onChanged` lets the caller (the accounts list) know a balance may have
// shifted, so it can re-fetch and show the updated bakiye without this hook
// needing to know anything about the accounts list itself.
export function useCariMovements(cariId, onChanged) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!cariId) {
      setMovements([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setMovements(await fetchCariMovements(cariId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cariId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addMovement = useCallback(
    async (movement) => {
      await createCariMovement(cariId, movement);
      await reload();
      onChanged?.();
    },
    [cariId, reload, onChanged]
  );

  const editMovement = useCallback(
    async (id, fields) => {
      await updateCariMovement(id, fields);
      await reload();
      onChanged?.();
    },
    [reload, onChanged]
  );

  const removeMovement = useCallback(
    async (id) => {
      const prev = movements;
      setMovements((cur) => cur.filter((m) => m.id !== id)); // optimistic
      try {
        await deleteCariMovement(id);
        onChanged?.();
      } catch (err) {
        setError(err.message);
        setMovements(prev);
      }
    },
    [movements, onChanged]
  );

  return { movements, loading, error, addMovement, editMovement, removeMovement };
}
