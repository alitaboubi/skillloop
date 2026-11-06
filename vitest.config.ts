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
    env: { VITE_TURNSTILE_SITE_KEY: "", VITE_ACCOUNT_DELETION: "", VITE_GOOGLE_SITE_VERIFICATION: "", VITE_NOTIFY_ME: "", VITE_BEFORE_AFTER: "", VITE_PRO_PLAN: "", VITE_PRO_TOOLS: "", VITE_ADMIN: "", VITE_PAYMENTS: "", VITE_PAY_D17: "", VITE_PAY_RIB: "", VITE_PAY_FLOUCI: "", VITE_PAY_NAME: "", VITE_SOCIAL_FEATURES: "" },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
