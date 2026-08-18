import { json } from "./utils.js";

const PAYMENT_STATUSES = new Set(["odendi", "beklemede", "kismi"]);

function supplierRow(row) {
  return {
    id: row.id,
    ad: row.ad,
    yetkili: row.yetkili,
    telefon: row.telefon,
    adres: row.adres,
    createdAt: row.created_at,
  };
}

function purchaseRow(row) {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    tedarikciAdi: row.tedarikci_adi,
    urunAdi: row.urun_adi,
    barkod: row.barkod,
    miktar: row.miktar,
    birim: row.birim,
    birimFiyat: row.birim_fiyat,
    toplamTutar: row.toplam_tutar,
    odemeDurumu: row.odeme_durumu,
    tarih: row.tarih,
    notMetni: row.not_metni,
    createdAt: row.created_at,
  };
}

async function listSuppliers(env) {
  const { results } = await env.DB.prepare("SELECT * FROM suppliers ORDER BY ad COLLATE NOCASE").all();
  return json({ suppliers: results.map(supplierRow) });
}

async function createSupplier(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }
  const ad = String(body.ad ?? "").trim();
  if (!ad) return json({ error: "Tedarikçi adı zorunlu." }, { status: 400 });

  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO suppliers (id, ad, yetkili, telefon, adres, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  )
    .bind(
      id,
      ad,
      String(body.yetkili ?? "").trim() || null,
      String(body.telefon ?? "").trim() || null,
      String(body.adres ?? "").trim() || null,
      now
    )
    .run();

  return json({ id, createdAt: now }, { status: 201 });
}

async function deleteSupplier(env, id) {
  await env.DB.prepare("DELETE FROM suppliers WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}

async function listPurchases(env) {
  const { results } = await env.DB.prepare("SELECT * FROM purchases ORDER BY created_at DESC").all();
  return json({ purchases: results.map(purchaseRow) });
}

async function createPurchase(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const urunAdi = String(body.urunAdi ?? "").trim();
  if (!urunAdi) return json({ error: "Ürün adı zorunlu." }, { status: 400 });

  const miktar = body.miktar === "" || body.miktar == null ? null : Number(body.miktar);
  const birimFiyat = body.birimFiyat === "" || body.birimFiyat == null ? null : Number(body.birimFiyat);
  for (const [label, v] of [["Miktar", miktar], ["Birim fiyat", birimFiyat]]) {
    if (v != null && !Number.isFinite(v)) {
      return json({ error: `${label} geçerli bir sayı olmalı.` }, { status: 400 });
    }
  }
  const toplamTutarRaw = body.toplamTutar;
  const toplamTutar =
    toplamTutarRaw === "" || toplamTutarRaw == null
      ? miktar != null && birimFiyat != null
        ? Math.round(miktar * birimFiyat * 100) / 100
        : null
      : Number(toplamTutarRaw);
  if (toplamTutar != null && !Number.isFinite(toplamTutar)) {
    return json({ error: "Toplam tutar geçerli bir sayı olmalı." }, { status: 400 });
  }

  const odemeDurumu = PAYMENT_STATUSES.has(body.odemeDurumu) ? body.odemeDurumu : "beklemede";

  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO purchases
       (id, supplier_id, tedarikci_adi, urun_adi, barkod, miktar, birim, birim_fiyat, toplam_tutar, odeme_durumu, tarih, not_metni, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`
  )
    .bind(
      id,
      String(body.supplierId ?? "").trim() || null,
      String(body.tedarikciAdi ?? "").trim() || null,
      urunAdi,
      String(body.barkod ?? "").trim() || null,
      miktar,
      String(body.birim ?? "").trim() || null,
      birimFiyat,
      toplamTutar,
      odemeDurumu,
      String(body.tarih ?? "").trim() || null,
      String(body.notMetni ?? "").trim() || null,
      now
    )
    .run();

  return json({ id, createdAt: now, toplamTutar }, { status: 201 });
}

async function updatePurchaseStatus(request, env, id) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }
  if (!PAYMENT_STATUSES.has(body.odemeDurumu)) {
    return json({ error: "Geçersiz ödeme durumu." }, { status: 400 });
  }
  await env.DB.prepare("UPDATE purchases SET odeme_durumu = ?1 WHERE id = ?2").bind(body.odemeDurumu, id).run();
  return json({ ok: true });
}

async function deletePurchase(env, id) {
  await env.DB.prepare("DELETE FROM purchases WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}

// Handles /api/suppliers* and /api/purchases*. Returns a Response if it owns
// this route, or null so the caller can fall through to other handlers.
export async function handlePurchasesRoute(request, env, pathname) {
  if (pathname === "/api/suppliers") {
    if (request.method === "GET") return listSuppliers(env);
    if (request.method === "POST") return createSupplier(request, env);
  }
  const supplierMatch = pathname.match(/^\/api\/suppliers\/([^/]+)$/);
  if (supplierMatch && request.method === "DELETE") {
    return deleteSupplier(env, supplierMatch[1]);
  }

  if (pathname === "/api/purchases") {
    if (request.method === "GET") return listPurchases(env);
    if (request.method === "POST") return createPurchase(request, env);
  }
  const purchaseMatch = pathname.match(/^\/api\/purchases\/([^/]+)$/);
  if (purchaseMatch && request.method === "DELETE") {
    return deletePurchase(env, purchaseMatch[1]);
  }
  if (purchaseMatch && request.method === "PATCH") {
    return updatePurchaseStatus(request, env, purchaseMatch[1]);
  }

  return null;
}
