import { useEffect } from "react";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NOTIFICATIONS_ENABLED, parseFeed, type NotificationFeed } from "@/lib/notifications";

/** The bell's feed (newest 30 + unread total). Disabled while the flag is off or signed out. */
export const notificationsQuery = (userId: string) => queryOptions({
  queryKey: ["notifications", userId],
  enabled: NOTIFICATIONS_ENABLED && !!userId,
  staleTime: 30_000,
  refetchInterval: 120_000, // safety net if the realtime socket drops
  refetchOnWindowFocus: true,
  queryFn: async (): Promise<NotificationFeed> => {
    const { data, error } = await supabase.rpc("my_notifications" as never, { p_limit: 30 } as never);
    if (error) throw error;
    return parseFeed(data);
  },
});

/** Who triggered one notification (RLS: own rows only). Used to open the right support conversation from the bell. */
export async function notificationActor(id: string): Promise<string | null> {
  const { data } = await supabase.from("notifications" as never).select("actor_id").eq("id", id).maybeSingle();
  const actor = (data as { actor_id?: unknown } | null)?.actor_id;
  return typeof actor === "string" ? actor : null;
}

/** Marks some (ids) or all (null) as read; the bell updates at once and settles with the server. */
export function useMarkNotificationsRead(userId: string) {
  const qc = useQueryClient();
  const key = notificationsQuery(userId).queryKey;
  return useMutation({
    mutationFn: async (ids: string[] | null) => {
      const { error } = await supabase.rpc("mark_notifications_read" as never, { p_ids: ids } as never);
      if (error) throw error;
    },
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<NotificationFeed>(key);
      if (prev) {
        const items = prev.items.map((n) => (ids === null || ids.includes(n.id) ? { ...n, read: true } : n));
        const cleared = prev.items.filter((n) => !n.read && (ids === null || ids.includes(n.id))).length;
        qc.setQueryData<NotificationFeed>(key, { items, unread: ids === null ? 0 : Math.max(0, prev.unread - cleared) });
      }
      return { prev };
    },
    onError: (_e, _ids, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/**
 * One realtime listener (mounted ONCE, in SiteHeader via useNotificationAlerts — the bell itself renders twice): a new
 * row refreshes the feed and calls onNew with it, for the toast. RLS: a user only ever receives their own rows.
 */
export type LiveRow = { id?: unknown; kind?: unknown; request_id?: unknown; service_id?: unknown; actor_id?: unknown };
export function useNotificationsLive(userId: string | undefined, onNew?: (row: LiveRow) => void) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!NOTIFICATIONS_ENABLED || !userId) return;
    const ch = supabase
      .channel(`notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p) => {
        void qc.invalidateQueries({ queryKey: ["notifications", userId] });
        if (p.new) onNew?.(p.new as LiveRow);
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [userId, qc, onNew]);
}
