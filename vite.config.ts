import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  optimizeDeps: {
    include: ['html2pdf.js'],
    exclude: ['better-sqlite3'],
  },
  server: {
    host: "localhost",
    port: 5173,
    proxy: {
      '/api.php': {
        target: 'https://bureau.jecrilogistics.com',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'https://bureau.jecrilogistics.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "public",
          dest: ".",
        },
        {
          src: "api.php",
          dest: ".",
        },
        {
          src: "api-server.js",
          dest: ".",
        },
        {
          src: "utils",
          dest: ".",
        },
        {
          src: "*.db",
          dest: ".",
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
