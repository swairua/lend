import { defineConfig } from "vite";
import path from "node:path";
import { viteStaticCopy } from "vite-plugin-static-copy";

function tsPlugin() {
  return {
    name: "vite:ts",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || "").split("?")[0];
        if (!url.endsWith(".ts") && !url.endsWith(".tsx")) return next();
        if (url.endsWith(".d.ts")) return next();
        try {
          const result = await server.transformRequest(url);
          if (!result) return next();
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.end(result.code);
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  optimizeDeps: {
    include: ['html2pdf.js'],
    exclude: ['better-sqlite3'],
  },
  server: {
    host: "localhost",
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/borrower': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/admin': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/categories': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/products': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/loans': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/messages': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
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
    tsPlugin(),
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
