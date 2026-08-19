import { json } from "./utils.js";

// Barkod <-> ürün kimliği kataloğu - bkz. migrations/0007_urun_katalog.sql.
// Ürün Girişi (products) ile kasıtlı olarak ayrı tablo: bu yalnızca "bu
// barkod hangi ürün" eşlemesini tutuyor, stok/maliyet gibi hareket
// verisiyle karışmıyor.

function katalogRow(row) {
  return {
    id: row.id,
    barkod: row.barkod,
    urunAdi: row.urun_adi,
    kategori: row.kategori,
    birim: row.birim,
    createdAt: row.created_at,
  };
}

function isUniqueViolation(err) {
  return /UNIQUE constraint failed/i.test(err?.message || "");
}

async function listKatalog(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, barkod, urun_adi, kategori, birim, created_at FROM urun_katalog ORDER BY created_at DESC`
  ).all();
  return json({ items: results.map(katalogRow) });
}

async function createKatalog(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const barkod = String(body.barkod ?? "").trim();
  const urunAdi = String(body.urunAdi ?? "").trim();
  if (!barkod) return json({ error: "Barkod zorunlu." }, { status: 400 });
  if (!urunAdi) return json({ error: "Ürün adı zorunlu." }, { status: 400 });

  const id = crypto.randomUUID();
  const now = Date.now();

  try {
    await env.DB.prepare(
      `INSERT INTO urun_katalog (id, barkod, urun_adi, kategori, birim, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    )
      .bind(id, barkod, urunAdi, String(body.kategori ?? "").trim() || null, String(body.birim ?? "").trim() || null, now)
      .run();
  } catch (err) {
    if (isUniqueViolation(err)) {
      return json({ error: `"${barkod}" barkodu kataloğa zaten kayıtlı.` }, { status: 409 });
    }
    throw err;
  }

  return json({ id, createdAt: now }, { status: 201 });
}

async function updateKatalog(request, env, id) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const sets = [];
  const values = [];
  let idx = 1;

  if (Object.prototype.hasOwnProperty.call(body, "barkod")) {
    const barkod = String(body.barkod ?? "").trim();
    if (!barkod) return json({ error: "Barkod boş olamaz." }, { status: 400 });
    sets.push(`barkod = ?${idx++}`);
    values.push(barkod);
  }
  if (Object.prototype.hasOwnProperty.call(body, "urunAdi")) {
    const urunAdi = String(body.urunAdi ?? "").trim();
    if (!urunAdi) return json({ error: "Ürün adı boş olamaz." }, { status: 400 });
    sets.push(`urun_adi = ?${idx++}`);
    values.push(urunAdi);
  }
  for (const [key, column] of [["kategori", "kategori"], ["birim", "birim"]]) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      sets.push(`${column} = ?${idx++}`);
      values.push(String(body[key] ?? "").trim() || null);
    }
  }

  if (sets.length === 0) {
    return json({ error: "Güncellenecek alan belirtilmedi." }, { status: 400 });
  }

  values.push(id);
  try {
    await env.DB.prepare(`UPDATE urun_katalog SET ${sets.join(", ")} WHERE id = ?${idx}`)
      .bind(...values)
      .run();
  } catch (err) {
    if (isUniqueViolation(err)) {
      return json({ error: "Bu barkod kataloğa zaten kayıtlı." }, { status: 409 });
    }
    throw err;
  }

  return json({ ok: true });
}

async function deleteKatalog(env, id) {
  await env.DB.prepare("DELETE FROM urun_katalog WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}

// Handles /api/urun-katalog*. Returns a Response if it owns this route, or
// null so the caller can fall through to other route handlers.
export async function handleUrunKatalogRoute(request, env, pathname) {
  if (pathname === "/api/urun-katalog") {
    if (request.method === "GET") return listKatalog(env);
    if (request.method === "POST") return createKatalog(request, env);
  }

  const match = pathname.match(/^\/api\/urun-katalog\/([^/]+)$/);
  if (match && request.method === "DELETE") {
    return deleteKatalog(env, match[1]);
  }
  if (match && request.method === "PATCH") {
    return updateKatalog(request, env, match[1]);
  }

  return null;
}
