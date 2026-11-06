import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_ENABLED } from "@/lib/admin";
import { signImages } from "@/lib/services-db";
import {
  SOCIAL_FEATURES_ENABLED, normalizeFacebook, normalizeInstagram, parseMyFeatures, parsePeopleHits, parsePosts,
  parsePublicFeatures, type FeaturePerson, type PostDraft, type SocialPost,
} from "@/lib/social-features";

const rpc = async (fn: string, args?: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw error;
  return data as unknown;
};

/** Profile photos are storage paths: signed in one call (readable once a profile references them). */
async function withAvatars<T extends { avatarPath: string | null }>(rows: T[]): Promise<(T & { avatar: string | undefined })[]> {
  const urls = await signImages([...new Set(rows.flatMap((r) => (r.avatarPath ? [r.avatarPath] : [])))]).catch(() => ({} as Record<string, string>));
  return rows.map((r) => ({ ...r, avatar: r.avatarPath ? urls[r.avatarPath] : undefined }));
}

// ── operators (/admin) ──
export const SOCIAL_ADMIN_ENABLED = SOCIAL_FEATURES_ENABLED && ADMIN_ENABLED;

export type AdminPost = Omit<SocialPost, "people"> & { people: (FeaturePerson & { avatar?: string | undefined })[] };

export const adminSocialPostsQuery = () => queryOptions({
  queryKey: ["social", "admin-posts"],
  enabled: SOCIAL_ADMIN_ENABLED,
  staleTime: 30_000,
  queryFn: async (): Promise<AdminPost[]> => {
    const posts = parsePosts(await rpc("admin_social_posts"));
    const people = await withAvatars(posts.flatMap((p) => p.people));
    const byId = new Map(people.map((p) => [p.id, p.avatar]));
    return posts.map((p) => ({ ...p, people: p.people.map((x) => ({ ...x, avatar: byId.get(x.id) })) }));
  },
});

export const peopleSearchQuery = (q: string) => queryOptions({
  queryKey: ["social", "people", q.trim().toLowerCase()],
  enabled: SOCIAL_ADMIN_ENABLED && q.trim().length >= 2,
  staleTime: 60_000,
  queryFn: async () => withAvatars(parsePeopleHits(await rpc("admin_social_people_search", { p_q: q.trim() }))),
});

export function useAdminSocialActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["social", "admin-posts"] });
  const save = useMutation({
    mutationFn: async ({ id, draft }: { id: string | null; draft: PostDraft }) => {
      const out = await rpc("admin_social_post_save", {
        p_id: id, p_title: draft.title.trim(),
        p_instagram: draft.instagram.trim() ? normalizeInstagram(draft.instagram) : null,
        p_facebook: draft.facebook.trim() ? normalizeFacebook(draft.facebook) : null,
        p_people: [...new Set(draft.people)],
      });
      return parsePosts([out])[0] ?? null;
    },
    onSuccess: refresh,
  });
  const publish = useMutation({
    mutationFn: async ({ id, announce }: { id: string; announce: boolean }) => {
      const o = (await rpc("admin_social_post_publish", { p_id: id, p_announce: announce })) as Record<string, unknown> | null;
      return { people: Number(o?.["people"] ?? 0) || 0, everyone: Number(o?.["everyone"] ?? 0) || 0 };
    },
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (id: SocialPost["id"]) => { await rpc("admin_social_post_delete", { p_id: id }); },
    onSuccess: refresh,
  });
  return { save, publish, remove };
}

// ── the person in the post ──
export const myFeaturesQuery = (userId: string) => queryOptions({
  queryKey: ["social", "mine", userId],
  enabled: SOCIAL_FEATURES_ENABLED && !!userId,
  staleTime: 60_000,
  queryFn: async () => parseMyFeatures(await rpc("my_social_features")),
});

export function useSetFeatureChoice(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, show }: { id: string; show: boolean }) => { await rpc("set_social_feature_choice", { p_post: id, p_show: show }); },
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: ["social", "mine", userId] }),
      qc.invalidateQueries({ queryKey: ["social", "public", userId] }),
      qc.invalidateQueries({ queryKey: ["notifications", userId] }),
    ]),
  });
}

// ── public profile (anyone, signed in or not) ──
export const publicFeaturesQuery = (userId: string) => queryOptions({
  queryKey: ["social", "public", userId],
  enabled: SOCIAL_FEATURES_ENABLED && !!userId,
  staleTime: 5 * 60_000,
  queryFn: async () => parsePublicFeatures(await rpc("public_social_features", { p_user: userId })),
});
