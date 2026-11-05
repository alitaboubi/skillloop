/**
 * Google sign-in through Google Identity Services (GIS) + Supabase signInWithIdToken.
 *
 * Why: the classic Supabase OAuth redirect makes Google's account chooser say
 * "Accéder à l'application <project>.supabase.co". With GIS the popup belongs to this site's own origin,
 * so Google names skillloop.tn (or the verified brand name) instead — no paid Supabase custom domain needed.
 *
 * ── Configuration ───────────────────────────────────────────────────────────────────────────────────
 * VITE_GOOGLE_CLIENT_ID = the PUBLIC OAuth Web client ID (…apps.googleusercontent.com), the same client that is
 * set in Supabase → Authentication → Providers → Google. Unset → the old redirect flow is used, unchanged.
 * Google Cloud → Clients → that client → Authorized JavaScript origins must list https://<site> (and
 * http://localhost:8080 for dev). Keep the Supabase callback in Authorized redirect URIs (the fallback uses it).
 * ─────────────────────────────────────────────────────────────────────────────────────────────────────
 */
export function readClientId(v: unknown): string | null {
  return typeof v === "string" && /^[\w-]+\.apps\.googleusercontent\.com$/.test(v.trim()) ? v.trim() : null;
}
export const GOOGLE_CLIENT_ID = readClientId(import.meta.env["VITE_GOOGLE_CLIENT_ID"]);

export type GisButtonOptions = {
  type: "standard";
  theme: "outline" | "filled_black";
  size: "large";
  text: "continue_with";
  shape: "pill";
  logo_alignment: "center";
  width: number;
  locale: string;
};
export type GisApi = {
  initialize: (opts: {
    client_id: string;
    callback: (r: { credential?: string }) => void;
    nonce: string;
    ux_mode: "popup";
    auto_select: boolean;
    itp_support: boolean;
    use_fedcm_for_button: boolean;
  }) => void;
  renderButton: (el: HTMLElement, opts: GisButtonOptions) => void;
};
declare global { interface Window { google?: { accounts?: { id?: GisApi } } } }

const SRC = "https://accounts.google.com/gsi/client";
let loading: Promise<GisApi> | null = null;

/** Loads the GIS script once (only when a client ID is configured). A failed load can be retried. */
export function loadGis(): Promise<GisApi> {
  const ready = window.google?.accounts?.id;
  if (ready) return Promise.resolve(ready);
  loading ??= new Promise<GisApi>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => { const api = window.google?.accounts?.id; if (api) resolve(api); else { loading = null; reject(new Error("gis missing")); } };
    s.onerror = () => { s.remove(); loading = null; reject(new Error("gis load failed")); };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Replay protection: Google embeds sha256(raw) in the ID token, Supabase re-hashes the raw value and compares.
 */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hashed };
}
