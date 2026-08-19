import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchModulAyarlari, setModulAyari } from "../lib/api.js";

// Hangi modüllerin (App.jsx'teki TABS) menüde görüneceği - Ayarlar
// ekranından admin tarafından yönetiliyor. Bir modül için kayıt yoksa
// VARSAYILAN AKTİF (bkz. worker/modulAyarlari.js) - sadece kapatılanlar
// backend'de tutuluyor. App.jsx'te tek yerden çağrılıp nav filtrelemesi ve
// Ayarlar ekranına prop olarak veriliyor.
export function useModulAyarlari(enabled = true) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchModulAyarlari());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reload]);

  const disabledSet = useMemo(() => new Set(items.filter((i) => !i.aktif).map((i) => i.modulId)), [items]);

  const isModuleEnabled = useCallback((modulId) => !disabledSet.has(modulId), [disabledSet]);

  const toggleModule = useCallback(
    async (modulId, aktif) => {
      const prev = items;
      setItems((cur) => {
        const idx = cur.findIndex((i) => i.modulId === modulId);
        if (idx === -1) return [...cur, { modulId, aktif }];
        const next = [...cur];
        next[idx] = { modulId, aktif };
        return next;
      });
      try {
        await setModulAyari(modulId, aktif);
      } catch (err) {
        setError(err.message);
        setItems(prev);
      }
    },
    [items]
  );

  return { items, loading, error, isModuleEnabled, toggleModule };
}
