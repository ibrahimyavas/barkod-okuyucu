import { json } from "./utils.js";

// Müşteriler (satış tarafı) - worker/purchases.js'teki suppliers (tedarikçi,
// alış tarafı) ile birebir aynı desen, bilinçli olarak ayrı tablo/route.

function customerRow(row) {
  return {
    id: row.id,
    ad: row.ad,
    yetkili: row.yetkili,
    telefon: row.telefon,
    adres: row.adres,
    createdAt: row.created_at,
  };
}

async function listCustomers(env) {
  const { results } = await env.DB.prepare("SELECT * FROM customers ORDER BY ad COLLATE NOCASE").all();
  return json({ customers: results.map(customerRow) });
}

async function createCustomer(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }
  const ad = String(body.ad ?? "").trim();
  if (!ad) return json({ error: "Müşteri adı zorunlu." }, { status: 400 });

  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO customers (id, ad, yetkili, telefon, adres, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
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

const CUSTOMER_FIELDS = { ad: "ad", yetkili: "yetkili", telefon: "telefon", adres: "adres" };

async function updateCustomer(request, env, id) {
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
    if (!ad) return json({ error: "Müşteri adı boş olamaz." }, { status: 400 });
    sets.push(`ad = ?${idx++}`);
    values.push(ad);
  }
  for (const key of ["yetkili", "telefon", "adres"]) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      sets.push(`${CUSTOMER_FIELDS[key]} = ?${idx++}`);
      values.push(String(body[key] ?? "").trim() || null);
    }
  }
  if (sets.length === 0) return json({ error: "Güncellenecek alan belirtilmedi." }, { status: 400 });

  values.push(id);
  await env.DB.prepare(`UPDATE customers SET ${sets.join(", ")} WHERE id = ?${idx}`)
    .bind(...values)
    .run();
  return json({ ok: true });
}

async function deleteCustomer(env, id) {
  await env.DB.prepare("DELETE FROM customers WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}

// Handles /api/customers*. Returns a Response if it owns this route, or
// null so the caller can fall through to other route handlers.
export async function handleCustomersRoute(request, env, pathname) {
  if (pathname === "/api/customers") {
    if (request.method === "GET") return listCustomers(env);
    if (request.method === "POST") return createCustomer(request, env);
  }
  const match = pathname.match(/^\/api\/customers\/([^/]+)$/);
  if (match && request.method === "DELETE") {
    return deleteCustomer(env, match[1]);
  }
  if (match && request.method === "PATCH") {
    return updateCustomer(request, env, match[1]);
  }
  return null;
}
