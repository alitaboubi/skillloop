// Own Vite config (replaces @lovable.dev/vite-tanstack-config). Same plugins and settings the wrapper applied
// outside Lovable's sandbox, minus the Lovable editor/preview machinery. All plugins are direct dependencies.
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Server-only code can never be bundled into the client.
      importProtection: { behavior: "error", client: { files: ["**/server/**"], specifiers: ["server-only"] } },
      // src/server.ts is our SSR error wrapper.
      server: { entry: "server" },
    }),
    // Deploy build (Cloudflare Workers module), production builds only.
    // Worker name "skillloop" (must match the Worker in the Cloudflare dashboard for automatic builds); Workers Logs on
    // (free plan: errors and console output visible in the dashboard). deployConfig lets plain `npx wrangler deploy` find it.
    ...(command === "build"
      ? [nitro({
          defaultPreset: "cloudflare-module",
          cloudflare: {
            deployConfig: true,
            wrangler: {
              name: "skillloop",
              compatibility_date: "2026-10-25",
              observability: { enabled: true, head_sampling_rate: 1 },
              // AI stays off in code (only the exact string "true" enables it); keep_vars stops each deploy from
              // erasing the Text variables set in the Cloudflare dashboard (secrets are always kept).
              vars: { AI_ENABLED: "false" },
              keep_vars: true,
            },
          },
        })]
      : []),
    viteReact(),
  ],
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  server: { host: "::", port: 8080 },
}));
