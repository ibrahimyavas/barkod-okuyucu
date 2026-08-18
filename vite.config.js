import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Camera access (getUserMedia) requires a secure context. `vite --host` serves
// plain HTTP on the LAN, which most mobile browsers still treat as insecure
// unless the host is `localhost`. For real-device testing over Wi-Fi, use a
// tunnel (e.g. `npx localtunnel --port 5174` or ngrok) which gives you HTTPS.
export default defineConfig({
  plugins: [react()],
});
