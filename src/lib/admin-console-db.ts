import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_ENABLED } from "@/lib/admin";
import { signImages } from "@/lib/services-db";
import {
  isMissingFunction, parseLog, parseSubs, parseTodo, parseUserDetail, parseUsers, type SubFilter,
} from "@/lib/admin-console";

const rpc = async (fn: string, args?: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw error;
  return data as unknown;
};
/** A missing function (migration not applied) is not worth three retries. */
const retry = (count: number, e: unknown) => !isMissingFunction(e) && count < 2;

async function withAvatars<T extends { avatarPath: string | null }>(rows: T[]): Promise<(T & { avatar: string | undefined })[]> {
  const urls = await signImages([...new Set(rows.flatMap((r) => (r.avatarPath ? [r.avatarPath] : [])))]).catch(() => ({} as Record<string, string>));
  return rows.map((r) => ({ ...r, avatar: r.avatarPath ? urls[r.avatarPath] : undefined }));
}

export const PAGE_SIZE = 25;

export const todoQuery = () => queryOptions({
  queryKey: ["console", "todo"],
  enabled: ADMIN_ENABLED,
  staleTime: 30_000,
  refetchInterval: 60_000,
  retry,
  queryFn: async () => parseTodo(await rpc("admin_todo")),
});

export const usersQuery = (q: string, role: "all" | "pro" | "client", sort: "new" | "name", page: number) => queryOptions({
  queryKey: ["console", "users", q.trim().toLowerCase(), role, sort, page],
  enabled: ADMIN_ENABLED,
  staleTime: 30_000,
  placeholderData: keepPreviousData,
  retry,
  queryFn: async () => {
    const p = parseUsers(await rpc("admin_users", { p_q: q.trim() || null, p_role: role, p_sort: sort, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE }));
    return { total: p.total, items: await withAvatars(p.items) };
  },
});

export const userQuery = (id: string) => queryOptions({
  queryKey: ["console", "user", id],
  enabled: ADMIN_ENABLED && !!id,
  staleTime: 30_000,
  retry,
  queryFn: async () => {
    const d = parseUserDetail(await rpc("admin_user", { p_id: id }));
    if (!d) return null;
    const [withPhoto] = await withAvatars([d]);
    return withPhoto!;
  },
});

export const subsQuery = (filter: SubFilter) => queryOptions({
  queryKey: ["console", "subs", filter],
  enabled: ADMIN_ENABLED,
  staleTime: 30_000,
  retry,
  queryFn: async () => withAvatars(parseSubs(await rpc("admin_subscriptions", { p_status: filter }))),
});

export const logQuery = () => queryOptions({
  queryKey: ["console", "log"],
  enabled: ADMIN_ENABLED,
  staleTime: 30_000,
  retry,
  queryFn: async () => parseLog(await rpc("admin_log", { p_limit: 50 })),
});

export function useProAccess() {
  const qc = useQueryClient();
  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["console"] }),
    qc.invalidateQueries({ queryKey: ["admin-overview"] }),
  ]);
  const grant = useMutation({
    mutationFn: async ({ userId, days, note }: { userId: string; days: number; note: string }) => {
      const o = (await rpc("admin_grant_pro", { p_user: userId, p_days: days, p_note: note.trim() || null })) as Record<string, unknown> | null;
      return typeof o?.["until"] === "string" ? o["until"] : null;
    },
    onSuccess: refresh,
  });
  const end = useMutation({
    mutationFn: async ({ userId, note }: { userId: string; note: string }) => { await rpc("admin_end_pro", { p_user: userId, p_note: note.trim() || null }); },
    onSuccess: refresh,
  });
  return { grant, end };
}
