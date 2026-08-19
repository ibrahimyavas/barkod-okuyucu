import { json } from "./utils.js";

const ACCOUNT_TYPES = new Set(["musteri", "tedarikci", "diger"]);
const MOVEMENT_TYPES = new Set(["borc", "alacak"]);

function accountRow(row) {
  return {
    id: row.id,
    ad: row.ad,
    tur: row.tur,
    telefon: row.telefon,
    adres: row.adres,
    bakiye: row.bakiye ?? 0,
    createdAt: row.created_at,
  };
}

function movementRow(row) {
  return {
    id: row.id,
    cariId: row.cari_id,
    tur: row.tur,
    tutar: row.tutar,
    aciklama: row.aciklama,
    tarih: row.tarih,
    createdAt: row.created_at,
  };
}

async function listAccounts(env) {
  // Bakiye burada, her istekte hareketlerden hesaplanıyor - ayrı bir
  // "bakiye" kolonu tutup senkron kalmasını umursamak yerine tek doğruluk
  // kaynağı hareket tablosu.
  const { results } = await env.DB.prepare(
    `SELECT c.*, COALESCE(SUM(CASE WHEN h.tur = 'borc' THEN h.tutar WHEN h.tur = 'alacak' THEN -h.tutar ELSE 0 END), 0) AS bakiye
     FROM cari_hesaplar c
     LEFT JOIN cari_hareketler h ON h.cari_id = c.id
     GROUP BY c.id
     ORDER BY c.ad COLLATE NOCASE`
  ).all();
  return json({ accounts: results.map(accountRow) });
}

async function createAccount(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }
  const ad = String(body.ad ?? "").trim();
  if (!ad) return json({ error: "Cari adı zorunlu." }, { status: 400 });
  const tur = ACCOUNT_TYPES.has(body.tur) ? body.tur : "musteri";

  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO cari_hesaplar (id, ad, tur, telefon, adres, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  )
    .bind(id, ad, tur, String(body.telefon ?? "").trim() || null, String(body.adres ?? "").trim() || null, now)
    .run();

  return json({ id, createdAt: now }, { status: 201 });
}

async function updateAccount(request, env, id) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const sets = [];
  const values = [];
  let idx = 1;
  if (Object.prototype.hasOwnProperty.call(body, "ad")) {
    const ad = String(body.ad ?? "").trim();
    if (!ad) return json({ error: "Cari adı boş olamaz." }, { status: 400 });
    sets.push(`ad = ?${idx++}`);
    values.push(ad);
  }
  if (Object.prototype.hasOwnProperty.call(body, "tur")) {
    if (!ACCOUNT_TYPES.has(body.tur)) return json({ error: "Geçersiz tür." }, { status: 400 });
    sets.push(`tur = ?${idx++}`);
    values.push(body.tur);
  }
  for (const key of ["telefon", "adres"]) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      sets.push(`${key} = ?${idx++}`);
      values.push(String(body[key] ?? "").trim() || null);
    }
  }
  if (sets.length === 0) return json({ error: "Güncellenecek alan belirtilmedi." }, { status: 400 });

  values.push(id);
  await env.DB.prepare(`UPDATE cari_hesaplar SET ${sets.join(", ")} WHERE id = ?${idx}`)
    .bind(...values)
    .run();
  return json({ ok: true });
}

async function deleteAccount(env, id) {
  // Kendi hareketlerini de temizle - D1'de FK cascade'e güvenmek yerine.
  await env.DB.prepare("DELETE FROM cari_hareketler WHERE cari_id = ?1").bind(id).run();
  await env.DB.prepare("DELETE FROM cari_hesaplar WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}

async function listMovements(env, cariId) {
  const { results } = await env.DB.prepare("SELECT * FROM cari_hareketler WHERE cari_id = ?1 ORDER BY created_at DESC")
    .bind(cariId)
    .all();
  return json({ movements: results.map(movementRow) });
}

async function createMovement(request, env, cariId) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }
  if (!MOVEMENT_TYPES.has(body.tur)) {
    return json({ error: "Geçersiz hareket türü." }, { status: 400 });
  }
  const tutar = Number(body.tutar);
  if (!Number.isFinite(tutar) || tutar <= 0) {
    return json({ error: "Tutar sıfırdan büyük bir sayı olmalı." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO cari_hareketler (id, cari_id, tur, tutar, aciklama, tarih, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  )
    .bind(id, cariId, body.tur, tutar, String(body.aciklama ?? "").trim() || null, String(body.tarih ?? "").trim() || null, now)
    .run();

  return json({ id, createdAt: now }, { status: 201 });
}

async function updateMovement(request, env, id) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const sets = [];
  const values = [];
  let idx = 1;
  if (Object.prototype.hasOwnProperty.call(body, "tur")) {
    if (!MOVEMENT_TYPES.has(body.tur)) return json({ error: "Geçersiz hareket türü." }, { status: 400 });
    sets.push(`tur = ?${idx++}`);
    values.push(body.tur);
  }
  if (Object.prototype.hasOwnProperty.call(body, "tutar")) {
    const tutar = Number(body.tutar);
    if (!Number.isFinite(tutar) || tutar <= 0) {
      return json({ error: "Tutar sıfırdan büyük bir sayı olmalı." }, { status: 400 });
    }
    sets.push(`tutar = ?${idx++}`);
    values.push(tutar);
  }
  for (const key of ["aciklama", "tarih"]) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      sets.push(`${key} = ?${idx++}`);
      values.push(String(body[key] ?? "").trim() || null);
    }
  }
  if (sets.length === 0) return json({ error: "Güncellenecek alan belirtilmedi." }, { status: 400 });

  values.push(id);
  await env.DB.prepare(`UPDATE cari_hareketler SET ${sets.join(", ")} WHERE id = ?${idx}`)
    .bind(...values)
    .run();
  return json({ ok: true });
}

async function deleteMovement(env, id) {
  await env.DB.prepare("DELETE FROM cari_hareketler WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}

// Handles /api/cari-hesaplar* and /api/cari-hareketler/:id. Returns a
// Response if it owns this route, or null so the caller can fall through.
export async function handleCariRoute(request, env, pathname) {
  if (pathname === "/api/cari-hesaplar") {
    if (request.method === "GET") return listAccounts(env);
    if (request.method === "POST") return createAccount(request, env);
  }

  const accountMatch = pathname.match(/^\/api\/cari-hesaplar\/([^/]+)$/);
  if (accountMatch && request.method === "DELETE") {
    return deleteAccount(env, accountMatch[1]);
  }
  if (accountMatch && request.method === "PATCH") {
    return updateAccount(request, env, accountMatch[1]);
  }

  const movementsMatch = pathname.match(/^\/api\/cari-hesaplar\/([^/]+)\/hareketler$/);
  if (movementsMatch) {
    if (request.method === "GET") return listMovements(env, movementsMatch[1]);
    if (request.method === "POST") return createMovement(request, env, movementsMatch[1]);
  }

  const movementMatch = pathname.match(/^\/api\/cari-hareketler\/([^/]+)$/);
  if (movementMatch && request.method === "DELETE") {
    return deleteMovement(env, movementMatch[1]);
  }
  if (movementMatch && request.method === "PATCH") {
    return updateMovement(request, env, movementMatch[1]);
  }

  return null;
}
