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
    vergiOrani: row.vergi_orani,
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

const SUPPLIER_FIELDS = { ad: "ad", yetkili: "yetkili", telefon: "telefon", adres: "adres" };

async function updateSupplier(request, env, id) {
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
    if (!ad) return json({ error: "Tedarikçi adı boş olamaz." }, { status: 400 });
    sets.push(`ad = ?${idx++}`);
    values.push(ad);
  }
  for (const key of ["yetkili", "telefon", "adres"]) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      sets.push(`${SUPPLIER_FIELDS[key]} = ?${idx++}`);
      values.push(String(body[key] ?? "").trim() || null);
    }
  }
  if (sets.length === 0) return json({ error: "Güncellenecek alan belirtilmedi." }, { status: 400 });

  values.push(id);
  await env.DB.prepare(`UPDATE suppliers SET ${sets.join(", ")} WHERE id = ?${idx}`)
    .bind(...values)
    .run();
  return json({ ok: true });
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
  const vergiOraniRaw = body.vergiOrani;
  const vergiOrani = vergiOraniRaw === "" || vergiOraniRaw == null ? null : Number(vergiOraniRaw);
  if (vergiOrani != null && !Number.isFinite(vergiOrani)) {
    return json({ error: "Vergi oranı geçerli bir sayı olmalı." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO purchases
       (id, supplier_id, tedarikci_adi, urun_adi, barkod, miktar, birim, birim_fiyat, toplam_tutar, vergi_orani, odeme_durumu, tarih, not_metni, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`
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
      vergiOrani,
      odemeDurumu,
      String(body.tarih ?? "").trim() || null,
      String(body.notMetni ?? "").trim() || null,
      now
    )
    .run();

  // Fatura'daki postToCari ile aynı desen: opsiyonel, bir cari seçilmişse
  // tutarı ALACAK olarak işler (biz tedarikçiye borçlanırız - Cari Hesap'ın
  // "bakiye = Σborç-Σalacak" kuralında bu doğru yön). Yalnızca oluşturma
  // anında - bir düzenlemede tekrar gönderilmez (frontend zaten göndermiyor).
  if (body.postToCari && body.cariId && toplamTutar > 0) {
    await env.DB.prepare(
      `INSERT INTO cari_hareketler (id, cari_id, tur, tutar, aciklama, tarih, created_at)
       VALUES (?1, ?2, 'alacak', ?3, ?4, ?5, ?6)`
    )
      .bind(
        crypto.randomUUID(),
        body.cariId,
        toplamTutar,
        `Satın alma: ${urunAdi}`,
        String(body.tarih ?? "").trim() || null,
        now
      )
      .run();
  }

  return json({ id, createdAt: now, toplamTutar }, { status: 201 });
}

const PURCHASE_TEXT_FIELDS = {
  supplierId: "supplier_id",
  tedarikciAdi: "tedarikci_adi",
  barkod: "barkod",
  birim: "birim",
  tarih: "tarih",
  notMetni: "not_metni",
};

// Partial update - handles both the quick "click the status badge" cycle
// (body: { odemeDurumu }) and the full "Düzenle" edit form (any subset of
// fields). If miktar/birimFiyat are both being edited and toplamTutar isn't
// explicitly given in the same request, it's recalculated - same rule
// createPurchase uses, so an edit can't silently leave a stale total.
async function updatePurchase(request, env, id) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (Object.prototype.hasOwnProperty.call(body, "odemeDurumu") && !PAYMENT_STATUSES.has(body.odemeDurumu)) {
    return json({ error: "Geçersiz ödeme durumu." }, { status: 400 });
  }

  const sets = [];
  const values = [];
  let idx = 1;

  if (Object.prototype.hasOwnProperty.call(body, "urunAdi")) {
    const urunAdi = String(body.urunAdi ?? "").trim();
    if (!urunAdi) return json({ error: "Ürün adı boş olamaz." }, { status: 400 });
    sets.push(`urun_adi = ?${idx++}`);
    values.push(urunAdi);
  }
  for (const [key, column] of Object.entries(PURCHASE_TEXT_FIELDS)) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      sets.push(`${column} = ?${idx++}`);
      values.push(String(body[key] ?? "").trim() || null);
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "odemeDurumu")) {
    sets.push(`odeme_durumu = ?${idx++}`);
    values.push(body.odemeDurumu);
  }

  let miktar, birimFiyat;
  for (const [key, label] of [["miktar", "Miktar"], ["birimFiyat", "Birim fiyat"]]) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    const raw = body[key];
    const n = raw === "" || raw == null ? null : Number(raw);
    if (n != null && !Number.isFinite(n)) return json({ error: `${label} geçerli bir sayı olmalı.` }, { status: 400 });
    if (key === "miktar") miktar = n;
    else birimFiyat = n;
    sets.push(`${key === "miktar" ? "miktar" : "birim_fiyat"} = ?${idx++}`);
    values.push(n);
  }

  if (Object.prototype.hasOwnProperty.call(body, "toplamTutar")) {
    const raw = body.toplamTutar;
    const n = raw === "" || raw == null ? null : Number(raw);
    if (n != null && !Number.isFinite(n)) return json({ error: "Toplam tutar geçerli bir sayı olmalı." }, { status: 400 });
    sets.push(`toplam_tutar = ?${idx++}`);
    values.push(n);
  } else if (miktar !== undefined && birimFiyat !== undefined && miktar != null && birimFiyat != null) {
    sets.push(`toplam_tutar = ?${idx++}`);
    values.push(Math.round(miktar * birimFiyat * 100) / 100);
  }

  if (Object.prototype.hasOwnProperty.call(body, "vergiOrani")) {
    const raw = body.vergiOrani;
    const n = raw === "" || raw == null ? null : Number(raw);
    if (n != null && !Number.isFinite(n)) return json({ error: "Vergi oranı geçerli bir sayı olmalı." }, { status: 400 });
    sets.push(`vergi_orani = ?${idx++}`);
    values.push(n);
  }

  if (sets.length === 0) {
    return json({ error: "Güncellenecek alan belirtilmedi." }, { status: 400 });
  }

  values.push(id);
  await env.DB.prepare(`UPDATE purchases SET ${sets.join(", ")} WHERE id = ?${idx}`)
    .bind(...values)
    .run();

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
  if (supplierMatch && request.method === "PATCH") {
    return updateSupplier(request, env, supplierMatch[1]);
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
    return updatePurchase(request, env, purchaseMatch[1]);
  }

  return null;
}
