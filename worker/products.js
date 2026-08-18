import { json } from "./utils.js";

function productRow(row) {
  return {
    id: row.id,
    barkod: row.barkod,
    urunAdi: row.urun_adi,
    kategori: row.kategori,
    depoKonumu: row.depo_konumu,
    alinisTarihi: row.alinis_tarihi,
    maliyet: row.maliyet,
    birim: row.birim,
    miktar: row.miktar,
    minStok: row.min_stok,
    createdAt: row.created_at,
  };
}

function parseOptionalNumber(value, label) {
  if (value === "" || value == null) return { ok: true, value: null };
  const n = Number(value);
  if (!Number.isFinite(n)) return { ok: false, error: `${label} geçerli bir sayı olmalı.` };
  return { ok: true, value: n };
}

async function listProducts(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, barkod, urun_adi, kategori, depo_konumu, alinis_tarihi, maliyet, birim, miktar, min_stok, created_at
     FROM products ORDER BY created_at DESC`
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

  const maliyet = parseOptionalNumber(body.maliyet, "Maliyet");
  const miktar = parseOptionalNumber(body.miktar, "Miktar");
  const minStok = parseOptionalNumber(body.minStok, "Min. stok");
  for (const r of [maliyet, miktar, minStok]) {
    if (!r.ok) return json({ error: r.error }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO products (id, barkod, urun_adi, kategori, depo_konumu, alinis_tarihi, maliyet, birim, miktar, min_stok, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
  )
    .bind(
      id,
      String(body.barkod ?? "").trim() || null,
      urunAdi,
      String(body.kategori ?? "").trim() || null,
      String(body.depoKonumu ?? "").trim() || null,
      String(body.alinisTarihi ?? "").trim() || null,
      maliyet.value,
      String(body.birim ?? "").trim() || null,
      miktar.value,
      minStok.value,
      now
    )
    .run();

  return json({ id, createdAt: now }, { status: 201 });
}

// Partial update - used by the stock adjuster (miktar) and the min. stock
// threshold editor. Only touches the fields actually present in the body.
async function updateProduct(request, env, id) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const sets = [];
  const values = [];
  let idx = 1;

  if (Object.prototype.hasOwnProperty.call(body, "miktar")) {
    const r = parseOptionalNumber(body.miktar, "Miktar");
    if (!r.ok) return json({ error: r.error }, { status: 400 });
    sets.push(`miktar = ?${idx++}`);
    values.push(r.value);
  }
  if (Object.prototype.hasOwnProperty.call(body, "minStok")) {
    const r = parseOptionalNumber(body.minStok, "Min. stok");
    if (!r.ok) return json({ error: r.error }, { status: 400 });
    sets.push(`min_stok = ?${idx++}`);
    values.push(r.value);
  }

  if (sets.length === 0) {
    return json({ error: "Güncellenecek alan belirtilmedi." }, { status: 400 });
  }

  values.push(id);
  await env.DB.prepare(`UPDATE products SET ${sets.join(", ")} WHERE id = ?${idx}`)
    .bind(...values)
    .run();

  return json({ ok: true });
}

async function deleteProduct(env, id) {
  await env.DB.prepare("DELETE FROM products WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}

// Handles /api/products*. Returns a Response if it owns this route, or null
// so the caller can fall through to other route handlers.
export async function handleProductsRoute(request, env, pathname) {
  if (pathname === "/api/products") {
    if (request.method === "GET") return listProducts(env);
    if (request.method === "POST") return createProduct(request, env);
  }

  const match = pathname.match(/^\/api\/products\/([^/]+)$/);
  if (match && request.method === "DELETE") {
    return deleteProduct(env, match[1]);
  }
  if (match && request.method === "PATCH") {
    return updateProduct(request, env, match[1]);
  }

  return null;
}
