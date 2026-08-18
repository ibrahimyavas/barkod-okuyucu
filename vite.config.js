import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Camera access (getUserMedia) requires a secure context. `vite --host` serves
// plain HTTP on the LAN, which most mobile browsers still treat as insecure
// unless the host is `localhost`. For real-device testing over Wi-Fi, use a
// tunnel (e.g. `npx localtunnel --port 5174` or ngrok) which gives you HTTPS.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // "Ürün Girişi" dashboard talks to /api/*, which is served by the
      // Worker (worker/index.js) + D1, not by Vite. Run `npm run worker:dev`
      // alongside `npm run dev` and this forwards API calls to it, so the
      // React UI still gets full Vite HMR while working against the real
      // backend. `npm run cf:dev` runs the built app through Wrangler alone
      // for an end-to-end check closer to production.
      "/api": "http://127.0.0.1:8787",
    },
  },
});
