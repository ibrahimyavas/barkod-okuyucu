// Cloudflare Worker: serves the built SPA for everything except /api/*, and
// backs the "Ürün Girişi" dashboard with a tiny D1-backed REST API for
// everything under /api/*. No framework - the route surface is small enough
// that adding one would just be another dependency to keep an eye on.

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers || {}) },
  });
}

function productRow(row) {
  return {
    id: row.id,
    barkod: row.barkod,
    urunAdi: row.urun_adi,
    kategori: row.kategori,
    depoKonumu: row.depo_konumu,
    alinisTarihi: row.alinis_tarihi,
    maliyet: row.maliyet,
    createdAt: row.created_at,
  };
}

async function listProducts(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, barkod, urun_adi, kategori, depo_konumu, alinis_tarihi, maliyet, created_at FROM products ORDER BY created_at DESC"
  ).all();
  return json({ products: results.map(productRow) });
}

async function createProduct(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const urunAdi = String(body.urunAdi ?? "").trim();
  if (!urunAdi) return json({ error: "Ürün adı zorunlu." }, { status: 400 });

  const maliyetRaw = body.maliyet;
  const maliyet = maliyetRaw === "" || maliyetRaw == null ? null : Number(maliyetRaw);
  if (maliyet != null && !Number.isFinite(maliyet)) {
    return json({ error: "Maliyet geçerli bir sayı olmalı." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO products (id, barkod, urun_adi, kategori, depo_konumu, alinis_tarihi, maliyet, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  )
    .bind(
      id,
      String(body.barkod ?? "").trim() || null,
      urunAdi,
      String(body.kategori ?? "").trim() || null,
      String(body.depoKonumu ?? "").trim() || null,
      String(body.alinisTarihi ?? "").trim() || null,
      maliyet,
      now
    )
    .run();

  return json({ id, createdAt: now }, { status: 201 });
}

async function deleteProduct(env, id) {
  await env.DB.prepare("DELETE FROM products WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}

async function handleApi(request, env, pathname) {
  if (pathname === "/api/products") {
    if (request.method === "GET") return listProducts(env);
    if (request.method === "POST") return createProduct(request, env);
  }

  const match = pathname.match(/^\/api\/products\/([^/]+)$/);
  if (match && request.method === "DELETE") {
    return deleteProduct(env, match[1]);
  }

  return json({ error: "Bulunamadı." }, { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url.pathname);
      } catch (err) {
        return json({ error: err?.message || "Sunucu hatası." }, { status: 500 });
      }
    }
    return env.ASSETS.fetch(request);
  },
};
