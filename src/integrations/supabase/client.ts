import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/** New Supabase API keys (sb_publishable_/sb_secret_) are opaque strings, not bearer JWTs. */
function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

/** Sends the key as `apikey` and never as a bearer token (a signed-in user's JWT still goes in Authorization). */
function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) headers.delete('Authorization');
    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

/** Public config: VITE_* in the browser; the server may also read the unprefixed names. Never a secret key. */
function readConfig(): { url: string; key: string } {
  const isServer = typeof window === 'undefined';
  const serverEnv = isServer && typeof process !== 'undefined' ? process.env : {};
  const url = import.meta.env['VITE_SUPABASE_URL'] || serverEnv['SUPABASE_URL'];
  const key = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || serverEnv['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) {
    const missing = [!url && 'VITE_SUPABASE_URL', !key && 'VITE_SUPABASE_PUBLISHABLE_KEY'].filter(Boolean).join(', ');
    const message = `Missing Supabase configuration: ${missing}. Add it to .env and restart the dev server.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }
  return { url, key };
}

function createSupabaseClient() {
  const { url, key } = readConfig();
  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    // Default browser storage (localStorage) for the session.
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Created on first use, so a missing configuration fails where it is used, with a clear message.
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

let _publicSupabase: ReturnType<typeof createSupabaseClient> | undefined;

/** The public read client never subscribes; this stub lets it start where WebSocket is missing (Node < 22). */
class NoRealtimeTransport {
  constructor() {
    throw new Error('Realtime is not available on the public read client');
  }
}

/**
 * Anonymous, session-less client for server rendering of public pages: it never reads or stores a user session,
 * so it sees exactly what a logged-out visitor sees (RLS: published, non-archived rows only).
 */
export const publicSupabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_publicSupabase) {
      const { url, key } = readConfig();
      _publicSupabase = createClient<Database>(url, key, {
        global: { fetch: createSupabaseFetch(key) },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        realtime: { transport: NoRealtimeTransport as never },
      });
    }
    return Reflect.get(_publicSupabase, prop, receiver);
  },
});
