import { useCallback, useEffect, useState } from "react";
import { fetchFaturaAyarlari, updateFaturaAyarlari } from "../lib/api.js";

export function useFaturaAyarlari() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(await fetchFaturaAyarlari());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveSettings = useCallback(async (fields) => {
    await updateFaturaAyarlari(fields);
    setSettings((prev) => ({ ...prev, ...fields }));
  }, []);

  return { settings, loading, error, saveSettings };
}
