import { json } from "./utils.js";

const DIRECTIONS = new Set(["giden", "gelen"]);
const STATUSES = new Set(["planlandi", "yolda", "teslim_edildi", "iptal"]);

function sevkiyatRow(row) {
  return {
    id: row.id,
    yon: row.yon,
    cariId: row.cari_id,
    tarafAdi: row.taraf_adi,
    barkod: row.barkod,
    urunAdi: row.urun_adi,
    aracPlakasi: row.arac_plakasi,
    surucu: row.surucu,
    cikisKonumu: row.cikis_konumu,
    varisKonumu: row.varis_konumu,
    planlananTarih: row.planlanan_tarih,
    gerceklesenTarih: row.gerceklesen_tarih,
    durum: row.durum,
    notMetni: row.not_metni,
    createdAt: row.created_at,
  };
}

async function listSevkiyatlar(env) {
  const { results } = await env.DB.prepare("SELECT * FROM sevkiyatlar ORDER BY created_at DESC").all();
  return json({ sevkiyatlar: results.map(sevkiyatRow) });
}

async function createSevkiyat(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const tarafAdi = String(body.tarafAdi ?? "").trim();
  if (!tarafAdi) return json({ error: "Taraf adı zorunlu." }, { status: 400 });

  const yon = DIRECTIONS.has(body.yon) ? body.yon : "giden";
  const durum = STATUSES.has(body.durum) ? body.durum : "planlandi";

  const id = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO sevkiyatlar
       (id, yon, cari_id, taraf_adi, barkod, urun_adi, arac_plakasi, surucu, cikis_konumu, varis_konumu,
        planlanan_tarih, gerceklesen_tarih, durum, not_metni, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`
  )
    .bind(
      id,
      yon,
      String(body.cariId ?? "").trim() || null,
      tarafAdi,
      String(body.barkod ?? "").trim() || null,
      String(body.urunAdi ?? "").trim() || null,
      String(body.aracPlakasi ?? "").trim() || null,
      String(body.surucu ?? "").trim() || null,
      String(body.cikisKonumu ?? "").trim() || null,
      String(body.varisKonumu ?? "").trim() || null,
      String(body.planlananTarih ?? "").trim() || null,
      String(body.gerceklesenTarih ?? "").trim() || null,
      durum,
      String(body.notMetni ?? "").trim() || null,
      now
    )
    .run();

  return json({ id, createdAt: now }, { status: 201 });
}

// Tek bir sevkiyatın GÜNCEL halini döner - Lojistik'in QR "canlı bilgi
// kartı" modu için (bkz. src/lib/qrPayload.js buildRouteRef/parseRouteRef):
// basılan etiket sadece bu ID'yi taşıyor, her okutmada buraya sorulup en
// güncel durum/güzergah gösteriliyor.
async function getSevkiyat(env, id) {
  const row = await env.DB.prepare("SELECT * FROM sevkiyatlar WHERE id = ?1").bind(id).first();
  if (!row) return json({ error: "Sevkiyat bulunamadı." }, { status: 404 });
  return json({ sevkiyat: sevkiyatRow(row) });
}

async function updateSevkiyat(request, env, id) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (body.durum != null && !STATUSES.has(body.durum)) {
    return json({ error: "Geçersiz durum." }, { status: 400 });
  }

  // Teslim edildi işaretlenince, elle girilmediyse gerçekleşen tarihi bugüne
  // ayarla - "teslim edildi dedim ama tarihi unuttum" olmasın diye.
  let gerceklesenTarih = body.gerceklesenTarih;
  if (body.durum === "teslim_edildi" && !gerceklesenTarih) {
    gerceklesenTarih = new Date().toISOString().slice(0, 10);
  }

  const sets = [];
  const values = [];
  let idx = 1;
  const fieldMap = {
    yon: "yon",
    tarafAdi: "taraf_adi",
    barkod: "barkod",
    urunAdi: "urun_adi",
    aracPlakasi: "arac_plakasi",
    surucu: "surucu",
    cikisKonumu: "cikis_konumu",
    varisKonumu: "varis_konumu",
    planlananTarih: "planlanan_tarih",
    durum: "durum",
    notMetni: "not_metni",
  };
  for (const [key, column] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      sets.push(`${column} = ?${idx++}`);
      values.push(String(body[key] ?? "").trim() || null);
    }
  }
  if (gerceklesenTarih !== undefined) {
    sets.push(`gerceklesen_tarih = ?${idx++}`);
    values.push(String(gerceklesenTarih ?? "").trim() || null);
  }

  if (sets.length === 0) {
    return json({ error: "Güncellenecek alan belirtilmedi." }, { status: 400 });
  }

  values.push(id);
  await env.DB.prepare(`UPDATE sevkiyatlar SET ${sets.join(", ")} WHERE id = ?${idx}`)
    .bind(...values)
    .run();

  return json({ ok: true, gerceklesenTarih });
}

async function deleteSevkiyat(env, id) {
  await env.DB.prepare("DELETE FROM sevkiyatlar WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}

// Handles /api/sevkiyatlar*. Returns a Response if it owns this route, or
// null so the caller can fall through to other route handlers.
export async function handleLojistikRoute(request, env, pathname) {
  if (pathname === "/api/sevkiyatlar") {
    if (request.method === "GET") return listSevkiyatlar(env);
    if (request.method === "POST") return createSevkiyat(request, env);
  }

  const match = pathname.match(/^\/api\/sevkiyatlar\/([^/]+)$/);
  if (match && request.method === "GET") {
    return getSevkiyat(env, match[1]);
  }
  if (match && request.method === "PATCH") {
    return updateSevkiyat(request, env, match[1]);
  }
  if (match && request.method === "DELETE") {
    return deleteSevkiyat(env, match[1]);
  }

  return null;
}
