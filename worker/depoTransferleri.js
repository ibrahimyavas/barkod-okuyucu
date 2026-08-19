import { json } from "./utils.js";

const STATUSES = new Set(["planlandi", "tamamlandi"]);

function transferRow(row) {
  return {
    id: row.id,
    barkod: row.barkod,
    urunAdi: row.urun_adi,
    miktar: row.miktar,
    birim: row.birim,
    kaynakKonum: row.kaynak_konum,
    hedefKonum: row.hedef_konum,
    tarih: row.tarih,
    durum: row.durum,
    notMetni: row.not_metni,
    createdAt: row.created_at,
  };
}

async function listTransferler(env) {
  const { results } = await env.DB.prepare("SELECT * FROM depo_transferleri ORDER BY created_at DESC").all();
  return json({ transferler: results.map(transferRow) });
}

async function createTransfer(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const urunAdi = String(body.urunAdi ?? "").trim();
  const kaynakKonum = String(body.kaynakKonum ?? "").trim();
  const hedefKonum = String(body.hedefKonum ?? "").trim();
  if (!urunAdi) return json({ error: "Ürün adı zorunlu." }, { status: 400 });
  if (!kaynakKonum) return json({ error: "Kaynak konum zorunlu." }, { status: 400 });
  if (!hedefKonum) return json({ error: "Hedef konum zorunlu." }, { status: 400 });

  const miktar = body.miktar === "" || body.miktar == null ? null : Number(body.miktar);
  if (miktar != null && !Number.isFinite(miktar)) {
    return json({ error: "Miktar geçerli bir sayı olmalı." }, { status: 400 });
  }

  const durum = STATUSES.has(body.durum) ? body.durum : "planlandi";
  const id = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO depo_transferleri
       (id, barkod, urun_adi, miktar, birim, kaynak_konum, hedef_konum, tarih, durum, not_metni, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
  )
    .bind(
      id,
      String(body.barkod ?? "").trim() || null,
      urunAdi,
      miktar,
      String(body.birim ?? "").trim() || null,
      kaynakKonum,
      hedefKonum,
      String(body.tarih ?? "").trim() || null,
      durum,
      String(body.notMetni ?? "").trim() || null,
      now
    )
    .run();

  return json({ id, createdAt: now }, { status: 201 });
}

async function updateTransfer(request, env, id) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (body.durum != null && !STATUSES.has(body.durum)) {
    return json({ error: "Geçersiz durum." }, { status: 400 });
  }

  const sets = [];
  const values = [];
  let idx = 1;
  const textFields = { barkod: "barkod", urunAdi: "urun_adi", birim: "birim", kaynakKonum: "kaynak_konum", hedefKonum: "hedef_konum", tarih: "tarih", durum: "durum", notMetni: "not_metni" };
  for (const [key, column] of Object.entries(textFields)) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      sets.push(`${column} = ?${idx++}`);
      values.push(String(body[key] ?? "").trim() || null);
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "miktar")) {
    const miktar = body.miktar === "" || body.miktar == null ? null : Number(body.miktar);
    if (miktar != null && !Number.isFinite(miktar)) {
      return json({ error: "Miktar geçerli bir sayı olmalı." }, { status: 400 });
    }
    sets.push(`miktar = ?${idx++}`);
    values.push(miktar);
  }

  if (sets.length === 0) {
    return json({ error: "Güncellenecek alan belirtilmedi." }, { status: 400 });
  }

  values.push(id);
  await env.DB.prepare(`UPDATE depo_transferleri SET ${sets.join(", ")} WHERE id = ?${idx}`)
    .bind(...values)
    .run();

  return json({ ok: true });
}

async function deleteTransfer(env, id) {
  await env.DB.prepare("DELETE FROM depo_transferleri WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}

// Handles /api/depo-transferleri*. Returns a Response if it owns this
// route, or null so the caller can fall through to other route handlers.
export async function handleDepoTransferleriRoute(request, env, pathname) {
  if (pathname === "/api/depo-transferleri") {
    if (request.method === "GET") return listTransferler(env);
    if (request.method === "POST") return createTransfer(request, env);
  }
  const match = pathname.match(/^\/api\/depo-transferleri\/([^/]+)$/);
  if (match && request.method === "PATCH") {
    return updateTransfer(request, env, match[1]);
  }
  if (match && request.method === "DELETE") {
    return deleteTransfer(env, match[1]);
  }
  return null;
}
