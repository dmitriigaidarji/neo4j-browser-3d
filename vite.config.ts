// `vitest/config` re-exports Vite's defineConfig with the `test` block typed.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative base keeps the build portable: it works when served from the
  // domain root, from a project page (/neo4j-browser-3d/) and from a PR
  // preview path (/pr-preview/pr-12/) without a rebuild.
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split the three heavyweight dependencies into their own chunks so a
        // change in app code does not invalidate all of them in the cache.
        manualChunks(id: string) {
          if (
            /node_modules\/(three|3d-force-graph|three-forcegraph|three-spritetext)\//.test(
              id,
            )
          ) {
            return "three";
          }
          if (/node_modules\/neo4j-driver/.test(id)) {
            return "neo4j";
          }
          if (
            /node_modules\/@neo4j-cypher|node_modules\/@codemirror|node_modules\/@lezer/.test(
              id,
            )
          ) {
            return "editor";
          }
          return undefined;
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Deprecations raised inside Bulma's own sources; nothing actionable
        // here, and they drown out warnings from our stylesheets.
        silenceDeprecations: ["import", "global-builtin", "if-function"],
        quietDeps: true,
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 3000,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    css: false,
  },
});
