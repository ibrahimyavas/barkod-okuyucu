import { json } from "./utils.js";

const DOC_TYPES = new Set(["fatura", "irsaliye"]);

function settingsRow(row) {
  return {
    firmaAdi: row.firma_adi,
    firmaAdres: row.firma_adres,
    firmaTelefon: row.firma_telefon,
    firmaVergiNo: row.firma_vergi_no,
  };
}

function faturaRow(row) {
  let kalemler = [];
  try {
    kalemler = JSON.parse(row.kalemler);
  } catch {
    kalemler = [];
  }
  return {
    id: row.id,
    tur: row.tur,
    evrakNo: row.evrak_no,
    tarih: row.tarih,
    cariId: row.cari_id,
    muhatapAdi: row.muhatap_adi,
    muhatapAdres: row.muhatap_adres,
    muhatapTelefon: row.muhatap_telefon,
    kalemler,
    araToplam: row.ara_toplam,
    kdvOrani: row.kdv_orani,
    kdvTutari: row.kdv_tutari,
    genelToplam: row.genel_toplam,
    notMetni: row.not_metni,
    createdAt: row.created_at,
  };
}

async function getSettings(env) {
  const row = await env.DB.prepare("SELECT * FROM fatura_ayarlari WHERE id = 1").first();
  return json({ settings: settingsRow(row) });
}

async function updateSettings(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }
  await env.DB.prepare(
    `UPDATE fatura_ayarlari
     SET firma_adi = ?1, firma_adres = ?2, firma_telefon = ?3, firma_vergi_no = ?4
     WHERE id = 1`
  )
    .bind(
      String(body.firmaAdi ?? "").trim() || null,
      String(body.firmaAdres ?? "").trim() || null,
      String(body.firmaTelefon ?? "").trim() || null,
      String(body.firmaVergiNo ?? "").trim() || null
    )
    .run();
  return json({ ok: true });
}

async function listFaturalar(env) {
  const { results } = await env.DB.prepare("SELECT * FROM faturalar ORDER BY created_at DESC").all();
  return json({ faturalar: results.map(faturaRow) });
}

// Atomically claims the next number for the given doc type and formats it -
// a single UPDATE...RETURNING so two requests can never be handed the same
// number. Runs *after* input validation in createFatura, so a rejected
// submission never burns a number.
async function claimEvrakNo(env, tur) {
  const column = tur === "fatura" ? "sonraki_fatura_no" : "sonraki_irsaliye_no";
  const row = await env.DB.prepare(
    `UPDATE fatura_ayarlari SET ${column} = ${column} + 1 WHERE id = 1 RETURNING ${column} - 1 AS no`
  ).first();
  const prefix = tur === "fatura" ? "FTR" : "IRS";
  return `${prefix}-${String(row.no).padStart(4, "0")}`;
}

async function createFatura(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const tur = DOC_TYPES.has(body.tur) ? body.tur : "fatura";
  const muhatapAdi = String(body.muhatapAdi ?? "").trim();
  if (!muhatapAdi) return json({ error: "Muhatap adı zorunlu." }, { status: 400 });

  const kalemlerIn = Array.isArray(body.kalemler) ? body.kalemler : [];
  if (kalemlerIn.length === 0) return json({ error: "En az bir kalem eklemelisiniz." }, { status: 400 });

  const kalemler = [];
  for (const k of kalemlerIn) {
    const urunAdi = String(k.urunAdi ?? "").trim();
    if (!urunAdi) return json({ error: "Her kalemin ürün adı olmalı." }, { status: 400 });
    const miktar = Number(k.miktar);
    if (!Number.isFinite(miktar) || miktar <= 0) {
      return json({ error: `"${urunAdi}" için miktar geçerli bir sayı olmalı.` }, { status: 400 });
    }
    const birimFiyat = k.birimFiyat === "" || k.birimFiyat == null ? 0 : Number(k.birimFiyat);
    if (!Number.isFinite(birimFiyat) || birimFiyat < 0) {
      return json({ error: `"${urunAdi}" için birim fiyat geçerli bir sayı olmalı.` }, { status: 400 });
    }
    kalemler.push({
      urunAdi,
      miktar,
      birim: String(k.birim ?? "").trim(),
      birimFiyat,
      tutar: Math.round(miktar * birimFiyat * 100) / 100,
    });
  }

  const araToplam = Math.round(kalemler.reduce((sum, k) => sum + k.tutar, 0) * 100) / 100;
  const kdvOraniRaw = body.kdvOrani;
  const kdvOrani = tur === "fatura" && kdvOraniRaw !== "" && kdvOraniRaw != null ? Number(kdvOraniRaw) : 0;
  if (!Number.isFinite(kdvOrani) || kdvOrani < 0) {
    return json({ error: "KDV oranı geçerli bir sayı olmalı." }, { status: 400 });
  }
  const kdvTutari = Math.round(((araToplam * kdvOrani) / 100) * 100) / 100;
  const genelToplam = Math.round((araToplam + kdvTutari) * 100) / 100;

  const evrakNo = await claimEvrakNo(env, tur);
  const id = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO faturalar
       (id, tur, evrak_no, tarih, cari_id, muhatap_adi, muhatap_adres, muhatap_telefon,
        kalemler, ara_toplam, kdv_orani, kdv_tutari, genel_toplam, not_metni, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`
  )
    .bind(
      id,
      tur,
      evrakNo,
      String(body.tarih ?? "").trim() || null,
      String(body.cariId ?? "").trim() || null,
      muhatapAdi,
      String(body.muhatapAdres ?? "").trim() || null,
      String(body.muhatapTelefon ?? "").trim() || null,
      JSON.stringify(kalemler),
      araToplam,
      kdvOrani,
      kdvTutari,
      genelToplam,
      String(body.notMetni ?? "").trim() || null,
      now
    )
    .run();

  // Optional integration with Cari Hesap: post the total as a debt on the
  // chosen account, so invoicing someone shows up in their running balance
  // without a separate manual step.
  if (body.postToCari && body.cariId) {
    await env.DB.prepare(
      `INSERT INTO cari_hareketler (id, cari_id, tur, tutar, aciklama, tarih, created_at)
       VALUES (?1, ?2, 'borc', ?3, ?4, ?5, ?6)`
    )
      .bind(crypto.randomUUID(), body.cariId, genelToplam, `${evrakNo} numaralı belge`, String(body.tarih ?? "").trim() || null, now)
      .run();
  }

  return json({ id, evrakNo, araToplam, kdvTutari, genelToplam, createdAt: now }, { status: 201 });
}

async function deleteFatura(env, id) {
  await env.DB.prepare("DELETE FROM faturalar WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}

// Handles /api/fatura-ayarlari and /api/faturalar*. Returns a Response if it
// owns this route, or null so the caller can fall through.
export async function handleFaturaRoute(request, env, pathname) {
  if (pathname === "/api/fatura-ayarlari") {
    if (request.method === "GET") return getSettings(env);
    if (request.method === "PUT") return updateSettings(request, env);
  }

  if (pathname === "/api/faturalar") {
    if (request.method === "GET") return listFaturalar(env);
    if (request.method === "POST") return createFatura(request, env);
  }

  const match = pathname.match(/^\/api\/faturalar\/([^/]+)$/);
  if (match && request.method === "DELETE") {
    return deleteFatura(env, match[1]);
  }

  return null;
}
