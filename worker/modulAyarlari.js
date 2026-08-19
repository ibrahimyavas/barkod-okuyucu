import { json } from "./utils.js";

// Modül görünürlüğü (bkz. migrations/0010_modul_ic_lojistik.sql). Satır
// yoksa modül VARSAYILAN AKTİF - yalnızca kapatılan modüller için satır
// tutuluyor, böylece yeni bir modül eklendiğinde (kod değişikliği) admin
// ayrıca bir şey yapmadan otomatik görünür olur.

async function listModulAyarlari(env) {
  const { results } = await env.DB.prepare("SELECT modul_id, aktif FROM modul_ayarlari").all();
  return json({ items: results.map((r) => ({ modulId: r.modul_id, aktif: Boolean(r.aktif) })) });
}

async function setModulAyari(request, env, modulId) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }
  const aktif = body.aktif ? 1 : 0;
  await env.DB.prepare(
    `INSERT INTO modul_ayarlari (modul_id, aktif) VALUES (?1, ?2)
     ON CONFLICT(modul_id) DO UPDATE SET aktif = ?2`
  )
    .bind(modulId, aktif)
    .run();
  return json({ ok: true });
}

// Handles /api/modul-ayarlari*. Returns a Response if it owns this route,
// or null so the caller can fall through to other route handlers.
export async function handleModulAyarlariRoute(request, env, pathname) {
  if (pathname === "/api/modul-ayarlari" && request.method === "GET") {
    return listModulAyarlari(env);
  }
  const match = pathname.match(/^\/api\/modul-ayarlari\/([^/]+)$/);
  if (match && request.method === "PUT") {
    return setModulAyari(request, env, match[1]);
  }
  return null;
}
