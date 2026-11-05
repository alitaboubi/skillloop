import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { publicSupabase, supabase } from "@/integrations/supabase/client";
import { REVIEWS_ENABLED, type ReviewSummary } from "./reviews";

/**
 * Reviews data (migration 20261105120000_reviews.sql). Every query is disabled while VITE_REVIEWS is off, so nothing
 * here touches the database then. Public reads go through the review functions only (never the table).
 */

/** A review as its two parties read it (RLS: client or pro of the request). */
export type OwnReviewRow = {
  id: string; request_id: string; service_id: string; client_id: string; provider_id: string;
  rating: number; comment: string | null; created_at: string; updated_at: string | null;
  reply: string | null; replied_at: string | null; reported_at: string | null; hidden_at: string | null;
};
const OWN_COLUMNS = "id, request_id, service_id, client_id, provider_id, rating, comment, created_at, updated_at, reply, replied_at, reported_at, hidden_at";

/** A visible review as the public reads it (provider_reviews): author is "Amira S.", no ids of people. */
export type PublicReview = {
  id: string; service_id: string; service_title: string; rating: number; comment: string | null; created_at: string;
  updated_at: string | null; reply: string | null; replied_at: string | null; author: string | null;
};

const rows = <T,>(data: unknown) => (Array.isArray(data) ? (data as T[]) : []);

/** Reviews this user wrote or received (client side: which requests are already reviewed; pro side: replies/reports). */
export const myReviewsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["reviews", "mine", userId],
    enabled: REVIEWS_ENABLED && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews" as never).select(OWN_COLUMNS).order("created_at", { ascending: false });
      if (error) throw error;
      return rows<OwnReviewRow>(data);
    },
  });

export const providerSummaryQuery = (providerId: string) =>
  queryOptions({
    queryKey: ["reviews", "summary", providerId],
    enabled: REVIEWS_ENABLED && !!providerId,
    staleTime: 60_000,
    queryFn: async (): Promise<ReviewSummary | null> => {
      const { data, error } = await publicSupabase.rpc("provider_review_summary" as never, { p_provider: providerId } as never);
      if (error) throw error;
      return rows<ReviewSummary>(data)[0] ?? null;
    },
  });

/** Summaries for many pros at once (Explore cards). Pros without reviews are absent from the map. */
export const reviewSummariesQuery = (providerIds: string[]) => {
  const ids = [...new Set(providerIds)].sort().slice(0, 100);
  return queryOptions({
    queryKey: ["reviews", "summaries", ids.join(",")],
    enabled: REVIEWS_ENABLED && ids.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await publicSupabase.rpc("review_summaries" as never, { p_providers: ids } as never);
      if (error) throw error;
      return new Map(rows<ReviewSummary & { provider_id: string }>(data).map((r) => [r.provider_id, r]));
    },
  });
};

export const PAGE_SIZE = 6;

export const providerReviewsQuery = (providerId: string) =>
  infiniteQueryOptions({
    queryKey: ["reviews", "list", providerId],
    enabled: REVIEWS_ENABLED && !!providerId,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await publicSupabase.rpc("provider_reviews" as never, { p_provider: providerId, p_limit: PAGE_SIZE, p_before: pageParam } as never);
      if (error) throw error;
      return rows<PublicReview>(data);
    },
    getNextPageParam: (last) => (last.length === PAGE_SIZE ? last[last.length - 1]!.created_at : undefined),
  });

type Result = { error: { message: string } | null };

export async function submitReview(requestId: string, rating: number, comment: string): Promise<Result> {
  const { error } = await supabase.from("reviews" as never).insert({ request_id: requestId, rating, comment: comment.trim() || null } as never);
  return { error };
}

export async function updateReview(id: string, rating: number, comment: string): Promise<Result> {
  const { error } = await supabase.from("reviews" as never).update({ rating, comment: comment.trim() || null } as never).eq("id", id);
  return { error };
}

export async function replyToReview(id: string, reply: string): Promise<Result> {
  const { error } = await supabase.from("reviews" as never).update({ reply: reply.trim() } as never).eq("id", id);
  return { error };
}

export async function reportReview(id: string, reason: string): Promise<Result> {
  const { error } = await supabase.from("reviews" as never).update({ report_reason: reason.trim() } as never).eq("id", id);
  return { error };
}
