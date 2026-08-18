import { useCallback, useEffect, useState } from "react";
import { fetchProducts, createProduct, deleteProduct, updateProduct as apiUpdateProduct } from "../lib/api.js";

// Product list lives in D1 (via the Worker API), not localStorage - unlike
// the scan queue, this is meant to be shared across devices.
export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await fetchProducts());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addProduct = useCallback(
    async (product) => {
      await createProduct(product);
      await reload();
    },
    [reload]
  );

  const removeProduct = useCallback(
    async (id) => {
      const prev = products;
      setProducts((cur) => cur.filter((p) => p.id !== id)); // optimistic
      try {
        await deleteProduct(id);
      } catch (err) {
        setError(err.message);
        setProducts(prev); // roll back on failure
      }
    },
    [products]
  );

  // Used by the stock adjuster (miktar) and the min. stock threshold editor.
  const updateProduct = useCallback(
    async (id, fields) => {
      const prev = products;
      setProducts((cur) => cur.map((p) => (p.id === id ? { ...p, ...fields } : p))); // optimistic
      try {
        await apiUpdateProduct(id, fields);
      } catch (err) {
        setError(err.message);
        setProducts(prev); // roll back on failure
        throw err;
      }
    },
    [products]
  );

  return { products, loading, error, addProduct, removeProduct, updateProduct, reload };
}
