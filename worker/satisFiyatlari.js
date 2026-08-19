import { json } from "./utils.js";

// Satış Fiyatları: stok (Ürün Girişi) ile Satış (POS) arasındaki ara katman
// - bkz. migrations/0009_satis.sql. Yalnızca vergisiz taban satış fiyatını
// tutuyor; vergi oranı burada KOPYALANMIYOR, Satış (POS) ve bu ekranın
// kendisi "son satış fiyatı"nı göstermek için products.vergi_orani'yi her
// zaman canlı okuyor (frontend'de, bkz. lib/satis.js) - böylece vergi oranı
// Ürün Girişi'nde değişirse son satış fiyatı otomatik güncel kalır.

function satisFiyatiRow(row) {
  return {
    id: row.id,
    barkod: row.barkod,
    satisFiyati: row.satis_fiyati,
    createdAt: row.created_at,
  };
}

function isUniqueViolation(err) {
  return /UNIQUE constraint failed/i.test(err?.message || "");
}

async function listSatisFiyatlari(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, barkod, satis_fiyati, created_at FROM satis_fiyatlari ORDER BY created_at DESC`
  ).all();
  return json({ items: results.map(satisFiyatiRow) });
}

async function createSatisFiyati(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const barkod = String(body.barkod ?? "").trim();
  if (!barkod) return json({ error: "Barkod zorunlu." }, { status: 400 });
  const satisFiyati = Number(body.satisFiyati);
  if (!Number.isFinite(satisFiyati) || satisFiyati < 0) {
    return json({ error: "Satış fiyatı geçerli bir sayı olmalı." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  try {
    await env.DB.prepare(
      `INSERT INTO satis_fiyatlari (id, barkod, satis_fiyati, created_at) VALUES (?1, ?2, ?3, ?4)`
    )
      .bind(id, barkod, satisFiyati, now)
      .run();
  } catch (err) {
    if (isUniqueViolation(err)) {
      return json({ error: `"${barkod}" barkodu için satış fiyatı zaten tanımlı - düzenleyin.` }, { status: 409 });
    }
    throw err;
  }

  return json({ id, createdAt: now }, { status: 201 });
}

async function updateSatisFiyati(request, env, id) {
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
  if (Object.prototype.hasOwnProperty.call(body, "satisFiyati")) {
    const satisFiyati = Number(body.satisFiyati);
    if (!Number.isFinite(satisFiyati) || satisFiyati < 0) {
      return json({ error: "Satış fiyatı geçerli bir sayı olmalı." }, { status: 400 });
    }
    sets.push(`satis_fiyati = ?${idx++}`);
    values.push(satisFiyati);
  }

  if (sets.length === 0) {
    return json({ error: "Güncellenecek alan belirtilmedi." }, { status: 400 });
  }

  values.push(id);
  try {
    await env.DB.prepare(`UPDATE satis_fiyatlari SET ${sets.join(", ")} WHERE id = ?${idx}`)
      .bind(...values)
      .run();
  } catch (err) {
    if (isUniqueViolation(err)) {
      return json({ error: "Bu barkod için satış fiyatı zaten tanımlı." }, { status: 409 });
    }
    throw err;
  }

  return json({ ok: true });
}

async function deleteSatisFiyati(env, id) {
  await env.DB.prepare("DELETE FROM satis_fiyatlari WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}

// Handles /api/satis-fiyatlari*. Returns a Response if it owns this route,
// or null so the caller can fall through to other route handlers.
export async function handleSatisFiyatlariRoute(request, env, pathname) {
  if (pathname === "/api/satis-fiyatlari") {
    if (request.method === "GET") return listSatisFiyatlari(env);
    if (request.method === "POST") return createSatisFiyati(request, env);
  }

  const match = pathname.match(/^\/api\/satis-fiyatlari\/([^/]+)$/);
  if (match && request.method === "DELETE") {
    return deleteSatisFiyati(env, match[1]);
  }
  if (match && request.method === "PATCH") {
    return updateSatisFiyati(request, env, match[1]);
  }

  return null;
}
