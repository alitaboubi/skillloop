import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lastMessagesQuery } from "@/lib/requests-db";
import { READ_EVENT, loadReadState, unreadThreads } from "@/lib/unread";

/** Unread conversations for the signed-in user (device-local read state, see src/lib/unread.ts). */
export function useUnread(userId: string | undefined) {
  const last = useQuery({ ...lastMessagesQuery(userId ?? ""), enabled: !!userId, refetchInterval: 60_000, refetchOnWindowFocus: true });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(READ_EVENT, bump);
    window.addEventListener("storage", bump); // another tab read a conversation
    return () => { window.removeEventListener(READ_EVENT, bump); window.removeEventListener("storage", bump); };
  }, []);
  const ids = useMemo(
    () => (userId && last.data ? unreadThreads(last.data, userId, loadReadState(userId)) : new Set<string>()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, last.data, version],
  );
  return { ids, count: ids.size };
}

/** One realtime listener for the whole app: a new message refreshes the latest-message list (RLS: own conversations only). */
export function useUnreadLive(userId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`unread-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => qc.invalidateQueries({ queryKey: ["messages", "last", userId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc]);
}
