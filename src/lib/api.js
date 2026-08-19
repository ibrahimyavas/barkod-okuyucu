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

function withJsonBody(method, body) {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

export async function fetchProducts() {
  const data = await request("/api/products");
  return data.products;
}

export function createProduct(product) {
  return request("/api/products", withJsonBody("POST", product));
}

export function deleteProduct(id) {
  return request(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function updateProduct(id, fields) {
  return request(`/api/products/${encodeURIComponent(id)}`, withJsonBody("PATCH", fields));
}

export async function fetchSuppliers() {
  const data = await request("/api/suppliers");
  return data.suppliers;
}

export function createSupplier(supplier) {
  return request("/api/suppliers", withJsonBody("POST", supplier));
}

export function deleteSupplier(id) {
  return request(`/api/suppliers/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function fetchPurchases() {
  const data = await request("/api/purchases");
  return data.purchases;
}

export function createPurchase(purchase) {
  return request("/api/purchases", withJsonBody("POST", purchase));
}

export function updatePurchaseStatus(id, odemeDurumu) {
  return request(`/api/purchases/${encodeURIComponent(id)}`, withJsonBody("PATCH", { odemeDurumu }));
}

export function deletePurchase(id) {
  return request(`/api/purchases/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function fetchCariAccounts() {
  const data = await request("/api/cari-hesaplar");
  return data.accounts;
}

export function createCariAccount(account) {
  return request("/api/cari-hesaplar", withJsonBody("POST", account));
}

export function deleteCariAccount(id) {
  return request(`/api/cari-hesaplar/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function fetchCariMovements(cariId) {
  const data = await request(`/api/cari-hesaplar/${encodeURIComponent(cariId)}/hareketler`);
  return data.movements;
}

export function createCariMovement(cariId, movement) {
  return request(`/api/cari-hesaplar/${encodeURIComponent(cariId)}/hareketler`, withJsonBody("POST", movement));
}

export function deleteCariMovement(id) {
  return request(`/api/cari-hareketler/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function fetchFaturaAyarlari() {
  const data = await request("/api/fatura-ayarlari");
  return data.settings;
}

export function updateFaturaAyarlari(settings) {
  return request("/api/fatura-ayarlari", withJsonBody("PUT", settings));
}

export async function fetchFaturalar() {
  const data = await request("/api/faturalar");
  return data.faturalar;
}

export function createFatura(fatura) {
  return request("/api/faturalar", withJsonBody("POST", fatura));
}

export function deleteFatura(id) {
  return request(`/api/faturalar/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function login(password) {
  return request("/api/auth/login", withJsonBody("POST", { password }));
}

export function logout() {
  return request("/api/auth/logout", { method: "POST" });
}

export async function fetchAuthStatus() {
  const data = await request("/api/auth/me");
  return data.authenticated;
}
