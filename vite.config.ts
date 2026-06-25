import { defineConfig } from "vite";
import path from "node:path";
import { viteStaticCopy } from "vite-plugin-static-copy";

function tsPlugin() {
  return {
    name: "vite:ts",
    enforce: "pre" as const,
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
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

// Frontend SPA only. API calls go directly to the PHP backend
// (VITE_API_BASE, defaulting to https://bureau.jecrilogistics.com/api.php)
// in both dev and production — no local proxy, no mock Node server.
export default defineConfig({
  optimizeDeps: {
    include: ["html2pdf.js"],
  },
  server: {
    host: "localhost",
    port: 5173,
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
        { src: "public", dest: "." },
        { src: "api.php", dest: "." },
        { src: ".htaccess", dest: "." },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
