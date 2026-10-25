import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { signImages } from "./services-db";

type Party = { display_name: string; avatar_url?: string | null } | null;
export type RequestRow = {
  id: string; service_id: string; client_id: string; provider_id: string; message: string; status: string; created_at: string;
  /** Null when the service is no longer visible to this user (e.g. archived). */
  services: { title: string; category?: string; price?: number | null; price_model?: string; city?: string; remote?: boolean } | null;
  client: Party;
  provider: Party;
  /** Signed photo URLs of each party, when they have one. */
  client_avatar?: string | undefined;
  provider_avatar?: string | undefined;
};

export const myRequestsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["requests", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("id, service_id, client_id, provider_id, message, status, created_at, services(title, category, price, price_model, city, remote), client:profiles!requests_client_id_fkey(display_name, avatar_url), provider:profiles!requests_provider_id_fkey(display_name, avatar_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data as unknown as RequestRow[];
      const paths = [...new Set(rows.flatMap((r) => [r.client?.avatar_url, r.provider?.avatar_url]).filter((x): x is string => !!x))];
      const urls = await signImages(paths);
      return rows.map((r) => ({
        ...r,
        client_avatar: r.client?.avatar_url ? urls[r.client.avatar_url] : undefined,
        provider_avatar: r.provider?.avatar_url ? urls[r.provider.avatar_url] : undefined,
      }));
    },
  });

export type LastMessage = { request_id: string; body: string; created_at: string; sender_id: string };

/** Latest message per conversation the user takes part in (RLS limits rows to their own requests). */
export const lastMessagesQuery = (userId: string) =>
  queryOptions({
    queryKey: ["messages", "last", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("request_id, body, created_at, sender_id").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as LastMessage[];
    },
  });

export const STATUS_KEY = { pending: "st_pending", accepted: "st_accepted", declined: "st_declined", cancelled: "st_cancelled" } as const;
