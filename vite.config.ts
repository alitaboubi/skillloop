// Own Vite config (replaces @lovable.dev/vite-tanstack-config). Same plugins and settings the wrapper applied
// outside Lovable's sandbox, minus the Lovable editor/preview machinery. All plugins are direct dependencies.
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

// Public values baked into the browser bundle at BUILD time (Cloudflare: Settings → Build → Variables and secrets).
const REQUIRED_BUILD_VARS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SITE_URL", "VITE_TURNSTILE_SITE_KEY"];

/** Logs which required build variables are set (names only, never values); on Cloudflare Workers Builds a missing
 * one fails the build instead of deploying a site whose browser code can't reach Supabase. */
function checkBuildVars(mode: string) {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const missing = REQUIRED_BUILD_VARS.filter((k) => !env[k]?.trim());
  console.log(`[skillloop] build variables: ${REQUIRED_BUILD_VARS.map((k) => `${k}=${missing.includes(k) ? "MISSING" : "set"}`).join(", ")}`);
  if (missing.length && process.env["WORKERS_CI"]) {
    throw new Error(`[skillloop] Missing build variables: ${missing.join(", ")}. Add them in Cloudflare → Worker → Settings → Build → Variables and secrets, then retry the build.`);
  }
}

export default defineConfig(({ command, mode }) => {
  if (command === "build") checkBuildVars(mode);
  return {
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
};
});
