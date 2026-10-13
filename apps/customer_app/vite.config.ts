import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: "autoUpdate",
    manifest: { name: "Aise Bites - Scan. Order. Served.", short_name: "Aise Bites", start_url: ".", display: "standalone", background_color: "#0B0D14", theme_color: "#0B0D14", description: "Aise Bites · Powered by AiseServe | aise360.com", icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }, { src: "icon-512.png", sizes: "512x512", type: "image/png" }, { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] },
  })],
  server: { port: 5173 },
});
