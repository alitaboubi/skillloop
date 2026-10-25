/** Auth redirect URLs: Supabase reports a failed email link in the URL hash (#error=…&error_code=…). */
export type AuthUrlError = { code: string; description: string };

export function parseAuthHashError(hash: string): AuthUrlError | null {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const error = p.get("error");
  const code = p.get("error_code");
  if (!error && !code) return null;
  return { code: code || error || "unknown", description: p.get("error_description") ?? "" };
}

/** Friendly message key for a password-update failure — never Supabase's raw text. */
export function passwordUpdateErrorKey(e: { name?: string | undefined; code?: string | undefined; message?: string | undefined } | null): "reset_link_invalid_t" | "err_password" | "err_same_password" | "err_generic" {
  if (!e) return "err_generic";
  if (e.name === "AuthSessionMissingError" || e.code === "session_not_found" || /session missing/i.test(e.message ?? "")) return "reset_link_invalid_t";
  if (e.code === "same_password") return "err_same_password";
  if (e.code === "weak_password") return "err_password";
  return "err_generic";
}
