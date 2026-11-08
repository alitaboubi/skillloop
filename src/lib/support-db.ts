import { useEffect } from "react";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_ENABLED } from "@/lib/admin";
import { SUPPORT_CHAT_ENABLED, type SupportMessage } from "@/lib/support";

const from = (table: string) => supabase.from(table as never);
type Row = { id: string; from_team: boolean; body: string; created_at: string };
const toMessage = (r: Row): SupportMessage => ({ id: r.id, fromTeam: r.from_team, body: r.body, createdAt: r.created_at });

export type SupportThread = { messages: SupportMessage[]; userReadAt: string | null; status: "open" | "closed" | null };

/** The signed-in user's own conversation with the team (RLS: own rows only). */
export const supportThreadQuery = (userId: string) => queryOptions({
  queryKey: ["support", "thread", userId],
  enabled: SUPPORT_CHAT_ENABLED && !!userId,
  staleTime: 30_000,
  queryFn: async (): Promise<SupportThread> => {
    const [m, t] = await Promise.all([
      from("support_messages").select("id, from_team, body, created_at").eq("user_id" as never, userId as never).order("created_at", { ascending: true }).limit(200),
      from("support_threads").select("status, user_read_at").eq("user_id" as never, userId as never).maybeSingle(),
    ]);
    if (m.error) throw m.error;
    if (t.error) throw t.error;
    const thread = t.data as { status: "open" | "closed"; user_read_at: string | null } | null;
    return { messages: ((m.data ?? []) as Row[]).map(toMessage), userReadAt: thread?.user_read_at ?? null, status: thread?.status ?? null };
  },
});

/** One message from the signed-in user to the team (RLS: own conversation; the database rate-limits). */
export async function sendSupportMessage(body: string, page: string | null) {
  const { error } = await from("support_messages").insert({ body: body.trim(), page } as never);
  if (error) throw error;
}

export function useSendSupport(userId: string) {
  const qc = useQueryClient();
  const key = supportThreadQuery(userId).queryKey;
  return useMutation({
    mutationFn: ({ body, page }: { body: string; page: string | null }) => sendSupportMessage(body, page),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export async function markSupportRead() {
  const { error } = await supabase.rpc("support_mark_read" as never);
  if (error) throw error;
}

/** While the panel is open: a team reply appears live (RLS: own conversation only). */
export function useSupportLive(userId: string | undefined, active: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!SUPPORT_CHAT_ENABLED || !userId || !active) return;
    const ch = supabase
      .channel(`support-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["support", "thread", userId] }))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [userId, active, qc]);
}

// ── operators (/admin) ──
export const SUPPORT_ADMIN_ENABLED = SUPPORT_CHAT_ENABLED && ADMIN_ENABLED;

export type InboxRow = { userId: string; name: string; status: "open" | "closed"; lastAt: string; lastBody: string; lastFromTeam: boolean; unread: number };
export type AdminThread = {
  user: { id: string; name: string; city: string | null; since: string | null; services: number; requests: number };
  status: "open" | "closed";
  messages: (SupportMessage & { page: string | null })[];
};

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const s = (v: unknown) => (typeof v === "string" ? v : "");
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const st = (v: unknown): "open" | "closed" => (v === "closed" ? "closed" : "open");

export function parseInbox(raw: unknown): InboxRow[] {
  return (Array.isArray(raw) ? raw : []).flatMap((r) => {
    const d = obj(r);
    const userId = s(d["user_id"]);
    return userId ? [{ userId, name: s(d["name"]), status: st(d["status"]), lastAt: s(d["last_message_at"]), lastBody: s(d["last_body"]), lastFromTeam: d["last_from_team"] === true, unread: n(d["unread"]) }] : [];
  });
}

export function parseAdminThread(raw: unknown): AdminThread {
  const o = obj(raw), u = obj(o["user"]);
  return {
    user: { id: s(u["id"]), name: s(u["name"]), city: s(u["city"]) || null, since: s(u["since"]) || null, services: n(u["services"]), requests: n(u["requests"]) },
    status: st(o["status"]),
    messages: (Array.isArray(o["messages"]) ? o["messages"] : []).flatMap((r) => {
      const d = obj(r);
      const id = s(d["id"]);
      return id ? [{ id, fromTeam: d["from_team"] === true, body: s(d["body"]), createdAt: s(d["created_at"]), page: s(d["page"]) || null }] : [];
    }),
  };
}

export const supportInboxQuery = (status: "open" | "closed" | "all") => queryOptions({
  queryKey: ["support", "inbox", status],
  enabled: SUPPORT_ADMIN_ENABLED,
  staleTime: 15_000,
  refetchInterval: 30_000,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_support_inbox" as never, { p_status: status } as never);
    if (error) throw error;
    return parseInbox(data);
  },
});

export const adminSupportThreadQuery = (userId: string) => queryOptions({
  queryKey: ["support", "admin-thread", userId],
  enabled: SUPPORT_ADMIN_ENABLED && !!userId,
  refetchInterval: 20_000,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_support_thread" as never, { p_user: userId } as never);
    if (error) throw error;
    return parseAdminThread(data);
  },
});

export function useAdminSupportActions(userId: string) {
  const qc = useQueryClient();
  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["support", "admin-thread", userId] }),
    qc.invalidateQueries({ queryKey: ["support", "inbox"] }),
  ]);
  const reply = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.rpc("admin_support_reply" as never, { p_user: userId, p_body: body.trim() } as never);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const setStatus = useMutation({
    mutationFn: async (status: "open" | "closed") => {
      const { error } = await supabase.rpc("admin_support_set_status" as never, { p_user: userId, p_status: status } as never);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  return { reply, setStatus };
}
