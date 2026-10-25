/**
 * Server-only configuration (this folder is import-protected from client code, see vite.config.ts).
 * On Cloudflare, nitro exposes the Worker's variables and secrets as globalThis.__env__ for each request;
 * locally they come from process.env. Values are never logged.
 */
export function serverEnv(name: string): string | undefined {
  const cf = (globalThis as { __env__?: Record<string, unknown> }).__env__;
  const v = cf?.[name] ?? (typeof process !== "undefined" ? process.env[name] : undefined);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** Integer setting with a default and hard bounds (a typo can't disable a limit). */
export function intSetting(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = raw === undefined ? NaN : Number.parseInt(raw, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
