import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  server: {
    host: "localhost",
    port: 5173,
    proxy: {
      // Proxy API requests to local PHP backend during development
      '/auth': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/borrower': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/loans': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/repayments': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/products': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/categories': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/messages': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/public': {
        target: 'http://localhost:8082',
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
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
