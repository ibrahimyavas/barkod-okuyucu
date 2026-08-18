// Thin fetch wrapper for the /api/* routes the Worker exposes (see
// worker/index.js). Every product lives in D1, not localStorage - this is
// the one part of the app where the network is load-bearing.
async function request(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new Error("Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.");
  }
  if (!res.ok) {
    let message = `İstek başarısız (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON - keep the generic message
    }
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json();
}

export async function fetchProducts() {
  const data = await request("/api/products");
  return data.products;
}

export function createProduct(product) {
  return request("/api/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(product),
  });
}

export function deleteProduct(id) {
  return request(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" });
}
