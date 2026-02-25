import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const isDev = process.env.NODE_ENV === "development";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    react(),
    !isDev ? VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "fonts/*.otf"],
      manifest: {
        name: "eterOrg",
        short_name: "eterOrg",
        description: "Tasks, Timers & Docs — all in one place",
        start_url: "/",
        display: "standalone",
        background_color: "#0A0A0A",
        theme_color: "#D63230",
        orientation: "any",
        categories: ["productivity", "utilities"],
        icons: [
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,otf,woff,woff2,png,jpg,webp}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }) : null,
  ].filter(Boolean),
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info"],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          db: ["dexie"],
        },
      },
    },
  },
});
