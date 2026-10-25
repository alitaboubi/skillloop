import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Tests never depend on a developer's local .env: features keyed on env are off unless a test mocks them.
    env: { VITE_TURNSTILE_SITE_KEY: "", VITE_ACCOUNT_DELETION: "", VITE_GOOGLE_SITE_VERIFICATION: "" },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
