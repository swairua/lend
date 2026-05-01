import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  server: {
    host: "localhost",
    port: 5173,
    proxy: {
      // Proxy API requests to remote lending.wayrus.co.ke backend
      '/api': {
        target: 'https://lending.wayrus.co.ke',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api.php'),
      },
      '/auth': {
        target: 'https://lending.wayrus.co.ke',
        changeOrigin: true,
        rewrite: (path) => '/api.php' + path,
      },
      '/borrower': {
        target: 'https://lending.wayrus.co.ke',
        changeOrigin: true,
        rewrite: (path) => '/api.php' + path,
      },
      '/admin': {
        target: 'https://lending.wayrus.co.ke',
        changeOrigin: true,
        rewrite: (path) => '/api.php' + path,
      },
      '/loans': {
        target: 'https://lending.wayrus.co.ke',
        changeOrigin: true,
        rewrite: (path) => '/api.php' + path,
      },
      '/repayments': {
        target: 'https://lending.wayrus.co.ke',
        changeOrigin: true,
        rewrite: (path) => '/api.php' + path,
      },
      '/products': {
        target: 'https://lending.wayrus.co.ke',
        changeOrigin: true,
        rewrite: (path) => '/api.php' + path,
      },
      '/categories': {
        target: 'https://lending.wayrus.co.ke',
        changeOrigin: true,
        rewrite: (path) => '/api.php' + path,
      },
      '/messages': {
        target: 'https://lending.wayrus.co.ke',
        changeOrigin: true,
        rewrite: (path) => '/api.php' + path,
      },
      '/uploads': {
        target: 'https://lending.wayrus.co.ke',
        changeOrigin: true,
        rewrite: (path) => '/api.php' + path,
      },
      '/public': {
        target: 'https://lending.wayrus.co.ke',
        changeOrigin: true,
        rewrite: (path) => '/api.php' + path,
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
