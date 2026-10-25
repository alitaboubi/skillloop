import { queryOptions } from "@tanstack/react-query";
import { publicSupabase, supabase } from "@/integrations/supabase/client";
import { fetchPublicServicesByOwner, isUuid, signImages } from "./services-db";
import type { Service } from "./data";
export const PROFILE_SELECT = "id,display_name,title,bio,city,area,avatar_url,professional_details,created_at,preferred_lang";
type Db = typeof supabase;

/** Profile + contacts + portfolio + published service ids. `publicOnly` (server render) also filters contacts to public ones. */
async function loadProfile(id: string, db: Db, publicOnly: boolean) {
  const { data, error } = await db.from("profiles").select(PROFILE_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const contactsQ = db.from("profile_contacts").select("id,kind,value,is_public").eq("owner_id", id);
  const [contacts, portfolio, services] = await Promise.all([
    publicOnly ? contactsQ.eq("is_public", true) : contactsQ,
    db.from("portfolio_items").select("id,title,description,image_url").eq("owner_id", id).order("created_at", { ascending: false }),
    db.from("services").select("id").eq("owner_id", id).eq("status", "published").eq("archived", false),
  ]);
  if (contacts.error || portfolio.error || services.error) throw contacts.error ?? portfolio.error ?? services.error;
  const urls = await signImages([...(data.avatar_url ? [data.avatar_url] : []), ...(portfolio.data ?? []).map(x => x.image_url)], db);
  return { ...data, avatar: data.avatar_url ? urls[data.avatar_url] : undefined, contacts: contacts.data ?? [],
    portfolio: (portfolio.data ?? []).map(x => ({ ...x, image: urls[x.image_url] })), serviceIds: (services.data ?? []).map(x => x.id) };
}

export type ProfileData = NonNullable<Awaited<ReturnType<typeof loadProfile>>>;

export const profileQuery = (id: string) => queryOptions({
  queryKey: ["profile", id],
  queryFn: () => loadProfile(id, supabase, false),
});

/**
 * Server rendering of /pros/$id: what a logged-out visitor may see, read without any session —
 * public contacts only, published non-archived services only. Unknown id → null (404).
 */
export async function fetchPublicProfile(id: string, db: Db = publicSupabase): Promise<{ profile: ProfileData; services: Service[] } | null> {
  if (!isUuid(id)) return null;
  const profile = await loadProfile(id, db, true);
  // A deleted account keeps an anonymous profile row (empty name) for the other person's history: never public.
  if (!profile || !profile.display_name.trim()) return null;
  return { profile, services: await fetchPublicServicesByOwner(id, db) };
}
