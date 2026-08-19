// Cloudflare Worker: serves the built SPA for everything except /api/*, and
// backs each dashboard's data with tiny D1-backed REST routes under
// /api/*. No framework - route handlers live one per module in this folder
// (auth.js, products.js, ...) and get registered below.
import { json } from "./utils.js";
import { handleAuthRoute, requireAuth } from "./auth.js";
import { handleProductsRoute } from "./products.js";
import { handleUrunKatalogRoute } from "./urunKatalog.js";
import { handleSatisFiyatlariRoute } from "./satisFiyatlari.js";
import { handlePurchasesRoute } from "./purchases.js";
import { handleCariRoute } from "./cari.js";
import { handleFaturaRoute } from "./fatura.js";
import { handleLojistikRoute } from "./lojistik.js";

async function handleApi(request, env, url) {
  // Auth routes (/api/auth/login, /logout, /me) are public by definition.
  const authResponse = await handleAuthRoute(request, env, url);
  if (authResponse) return authResponse;

  // Everything else requires a valid session.
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  const productsResponse = await handleProductsRoute(request, env, url.pathname);
  if (productsResponse) return productsResponse;

  const urunKatalogResponse = await handleUrunKatalogRoute(request, env, url.pathname);
  if (urunKatalogResponse) return urunKatalogResponse;

  const satisFiyatlariResponse = await handleSatisFiyatlariRoute(request, env, url.pathname);
  if (satisFiyatlariResponse) return satisFiyatlariResponse;

  const purchasesResponse = await handlePurchasesRoute(request, env, url.pathname);
  if (purchasesResponse) return purchasesResponse;

  const cariResponse = await handleCariRoute(request, env, url.pathname);
  if (cariResponse) return cariResponse;

  const faturaResponse = await handleFaturaRoute(request, env, url.pathname);
  if (faturaResponse) return faturaResponse;

  const lojistikResponse = await handleLojistikRoute(request, env, url.pathname);
  if (lojistikResponse) return lojistikResponse;

  return json({ error: "Bulunamadı." }, { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        return json({ error: err?.message || "Sunucu hatası." }, { status: 500 });
      }
    }
    return env.ASSETS.fetch(request);
  },
};
