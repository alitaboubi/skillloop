import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clapperboard, ExternalLink, Facebook, Instagram, Megaphone, Pencil, Plus, Search, Send, Trash2, X, type LucideIcon,
} from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/media-viewer";
import { ShareKit } from "@/components/share-kit";
import { ErrorState, ListSkeleton } from "@/components/states";
import {
  PEOPLE_MAX, SOCIAL_FEATURES_ENABLED, TITLE_MAX, checkDraft, consentSummary, platformsOf, primaryUrl, socialErrorKey,
  type Choice, type DraftError, type MyFeature, type Platform, type PostDraft, type PublicFeature,
} from "@/lib/social-features";
import {
  SOCIAL_ADMIN_ENABLED, adminSocialPostsQuery, myFeaturesQuery, peopleSearchQuery, publicFeaturesQuery, useAdminSocialActions,
  useSetFeatureChoice, type AdminPost,
} from "@/lib/social-features-db";

const PLATFORM: Record<Platform, { icon: LucideIcon; label: TKey }> = {
  instagram: { icon: Instagram, label: "c_instagram" },
  facebook: { icon: Facebook, label: "c_facebook" },
};

function useDate() {
  const { lang } = useI18n();
  const fmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-TN" : lang, { day: "numeric", month: "long", year: "numeric" });
  return (iso: string) => fmt.format(new Date(iso));
}

/** The « poster » side of a card: brand surface, clapperboard, the platforms it is on. */
function Poster({ platforms, compact = false }: { platforms: Platform[]; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div aria-hidden className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-ink-hero text-ink-foreground ${compact ? "size-16" : "aspect-[4/5] w-24 sm:w-28"}`}>
      <Clapperboard className={compact ? "size-6" : "size-8"} />
      {!compact && (
        <span className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 pb-2">
          {platforms.map((p) => { const I = PLATFORM[p].icon; return <I key={p} className="size-4 opacity-90" aria-label={t(PLATFORM[p].label)} />; })}
        </span>
      )}
    </div>
  );
}

/** « Voir sur Instagram » · « Voir sur Facebook » — SkillLoop's own links, opened in a new tab. */
function WatchLinks({ post }: { post: Pick<PublicFeature, "instagramUrl" | "facebookUrl"> }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {platformsOf(post).map((p) => {
        const I = PLATFORM[p].icon;
        const href = p === "instagram" ? post.instagramUrl! : post.facebookUrl!;
        return (
          <a key={p} href={href} target="_blank" rel="noopener noreferrer" className="btn btn-outline min-h-10 text-sm">
            <I className="size-4" aria-hidden />{t("sf_watch_on", { p: t(PLATFORM[p].label) })}
            <ExternalLink className="size-3.5 opacity-70" aria-hidden />
          </a>
        );
      })}
    </div>
  );
}

const STATE: Record<Choice, { key: TKey; cls: string }> = {
  pending: { key: "sf_state_pending", cls: "bg-clay-soft text-clay-strong" },
  shown: { key: "sf_state_shown", cls: "bg-sea-soft text-sea" },
  hidden: { key: "sf_state_hidden", cls: "bg-muted text-muted-foreground" },
};

function MyFeatureCard({ f, userId }: { f: MyFeature; userId: string }) {
  const { t } = useI18n();
  const date = useDate();
  const id = useId();
  const choose = useSetFeatureChoice(userId);
  const shown = f.choice === "shown";
  const toggle = (show: boolean) => choose.mutate({ id: f.id, show }, {
    onSuccess: () => toast.success(t(show ? "sf_shown_toast" : "sf_hidden_toast")),
    onError: () => toast.error(t("sf_err_generic")),
  });
  return (
    <li className="panel flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
      <Poster platforms={platformsOf(f)} />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 dir="auto" className="text-base font-bold">{f.title}</h3>
            <p className="text-sm text-muted-foreground"><time dateTime={f.publishedAt}>{t("sf_published_on", { d: date(f.publishedAt) })}</time></p>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${STATE[f.choice].cls}`}>{t(STATE[f.choice].key)}</span>
        </div>
        <WatchLinks post={f} />
        <div className="flex items-center gap-3 rounded-xl border p-3">
          <Switch id={`${id}-show`} checked={shown} disabled={choose.isPending} onCheckedChange={toggle}
            className="data-[state=checked]:bg-sea data-[state=unchecked]:bg-muted-foreground/40" />
          <label htmlFor={`${id}-show`} className="cursor-pointer text-sm font-semibold">{t("sf_show_label")}</label>
        </div>
        <ShareKit href={primaryUrl(f) ?? undefined} title={f.title} text="sf_share_text" />
      </div>
    </li>
  );
}

/**
 * Dashboard « On parle de vous » (client and pro overview): the person's published SkillLoop posts, their choice to show
 * each on the public profile, and sharing. Renders nothing while the flag is off or when there is no post.
 */
export function MyFeatures({ userId }: { userId: string }) {
  const { t } = useI18n();
  const q = useQuery(myFeaturesQuery(userId));
  if (!SOCIAL_FEATURES_ENABLED || !q.data?.length) return null;
  return (
    <section id="features" aria-labelledby="sf-mine" className="scroll-mt-32 space-y-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="icon-well-clay size-10"><Clapperboard className="size-5" /></span>
        <div>
          <h2 id="sf-mine" className="text-lg font-bold">{t("sf_mine_t")}</h2>
          <p className="text-sm text-muted-foreground">{t("sf_mine_d")}</p>
        </div>
      </div>
      <ul className="space-y-3">{q.data.map((f) => <MyFeatureCard key={f.id} f={f} userId={userId} />)}</ul>
    </section>
  );
}

/** Public profile « Vu sur les réseaux SkillLoop »: only the posts this person chose to show. Nothing otherwise. */
export function ProfileFeatures({ userId, name }: { userId: string; name: string }) {
  const { t } = useI18n();
  const date = useDate();
  const q = useQuery(publicFeaturesQuery(userId));
  if (!SOCIAL_FEATURES_ENABLED || !q.data?.length) return null;
  return (
    <section id="media" aria-labelledby="pp-media" className="sd-rise scroll-mt-32">
      <div className="section-head">
        <h2 id="pp-media" className="section-title">{t("sf_public_t")}</h2>
        <span className="section-count">{q.data.length}</span>
      </div>
      <p dir="auto" className="mt-1 text-sm text-muted-foreground">{t("sf_public_d", { n: name })}</p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {q.data.map((f) => (
          <li key={f.id} className="panel flex gap-4 p-4">
            <Poster platforms={platformsOf(f)} />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div>
                <h3 dir="auto" className="font-bold">{f.title}</h3>
                <p className="text-sm text-muted-foreground"><time dateTime={f.publishedAt}>{date(f.publishedAt)}</time></p>
              </div>
              <div className="mt-auto"><WatchLinks post={f} /></div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Operators (/admin) ---------- */

type Picked = { id: string; name: string; city: string | null; pro: boolean; avatar?: string | undefined };
const EMPTY: PostDraft = { title: "", instagram: "", facebook: "", people: [] };

function PeoplePicker({ picked, onChange }: { picked: Picked[]; onChange: (p: Picked[]) => void }) {
  const { t } = useI18n();
  const id = useId();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  // Search after a short pause, not on every key.
  useEffect(() => { const h = setTimeout(() => setTerm(q), 250); return () => clearTimeout(h); }, [q]);
  const hits = useQuery(peopleSearchQuery(term));
  const full = picked.length >= PEOPLE_MAX;
  const ids = new Set(picked.map((p) => p.id));
  const list = (hits.data ?? []).filter((h) => !ids.has(h.id));
  return (
    <fieldset className="space-y-3">
      <legend className="flex w-full items-baseline justify-between gap-2 text-sm font-semibold">
        <span>{t("sf_adm_people")}</span>
        <span className="text-muted-foreground">{t("sf_adm_people_n", { n: picked.length, max: PEOPLE_MAX })}</span>
      </legend>
      {picked.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {picked.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-full border bg-card py-1 pe-1 ps-1">
              <Avatar src={p.avatar} name={p.name} size="sm" />
              <span dir="auto" className="text-sm font-semibold">{p.name}</span>
              <span className="text-sm text-muted-foreground">{t(p.pro ? "sf_adm_pro" : "sf_adm_client")}</span>
              <button type="button" onClick={() => onChange(picked.filter((x) => x.id !== p.id))} aria-label={t("sf_adm_remove", { n: p.name })}
                className="grid size-8 place-items-center rounded-full hover:bg-muted"><X className="size-4" aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
      {!full && (
        <div>
          <label htmlFor={`${id}-q`} className="sr-only">{t("sf_adm_search_ph")}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input id={`${id}-q`} type="search" value={q} onChange={(e) => setQ(e.target.value)} dir="auto" autoComplete="off"
              placeholder={t("sf_adm_search_ph")} className="field ps-9 text-sm" />
          </div>
          {term.trim().length >= 2 && (
            <div aria-live="polite" className="mt-2">
              {hits.isLoading ? <ListSkeleton rows={2} /> : hits.isError ? <ErrorState onRetry={() => hits.refetch()} /> : !list.length ? (
                <p className="text-sm text-muted-foreground">{t("sf_adm_no_hits")}</p>
              ) : (
                <ul className="max-h-64 space-y-1 overflow-y-auto">
                  {list.map((h) => (
                    <li key={h.id}>
                      <button type="button" onClick={() => { onChange([...picked, h]); setQ(""); setTerm(""); }}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start hover:bg-muted">
                        <Avatar src={h.avatar} name={h.name} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span dir="auto" className="block truncate text-sm font-semibold">{h.name}</span>
                          <span className="block text-sm text-muted-foreground">{[t(h.pro ? "sf_adm_pro" : "sf_adm_client"), h.city].filter(Boolean).join(" · ")}</span>
                        </span>
                        <Plus className="size-4 text-sea" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}

function PostEditor({ post, onDone }: { post: AdminPost | null; onDone: () => void }) {
  const { t } = useI18n();
  const id = useId();
  const { save, publish } = useAdminSocialActions();
  const [d, setD] = useState<PostDraft>(post
    ? { title: post.title, instagram: post.instagramUrl ?? "", facebook: post.facebookUrl ?? "", people: post.people.map((p) => p.id) }
    : EMPTY);
  const [picked, setPicked] = useState<Picked[]>(post?.people ?? []);
  const [announce, setAnnounce] = useState(false);
  const [err, setErr] = useState<DraftError | null>(null);
  const live = !!post?.publishedAt;
  const busy = save.isPending || publish.isPending;
  const draft = { ...d, people: picked.map((p) => p.id) };
  const fieldErr = (f: DraftError["field"]) => (err?.field === f ? err.key : null);

  const submit = async (andPublish: boolean) => {
    const problem = checkDraft(draft);
    setErr(problem);
    if (problem) return;
    try {
      const saved = await save.mutateAsync({ id: post?.id ?? null, draft });
      if (andPublish && saved) {
        const r = await publish.mutateAsync({ id: saved.id, announce: announce && !post?.announcedAt });
        toast.success(t("sf_adm_published_toast", { p: r.people, e: r.everyone }));
      } else toast.success(t("sf_adm_saved"));
      onDone();
    } catch (e) {
      toast.error(t(socialErrorKey(e)));
    }
  };
  const input = (name: "instagram" | "facebook", label: TKey, ph: string) => (
    <div>
      <label htmlFor={`${id}-${name}`} className="text-sm font-semibold">{t(label)}</label>
      <input id={`${id}-${name}`} type="url" inputMode="url" dir="ltr" value={d[name]} placeholder={ph} autoComplete="off"
        onChange={(e) => setD({ ...d, [name]: e.target.value })} aria-invalid={!!fieldErr(name) || fieldErr("links") ? true : undefined}
        aria-describedby={fieldErr(name) ? `${id}-${name}-err` : undefined} className="field mt-1 text-start text-sm" />
      {fieldErr(name) && <p id={`${id}-${name}-err`} className="mt-1 text-sm text-destructive">{t(fieldErr(name)!)}</p>}
    </div>
  );

  return (
    <form className="space-y-5 rounded-2xl border bg-surface-sunken p-4 sm:p-5" onSubmit={(e) => { e.preventDefault(); void submit(!live); }}>
      <div>
        <label htmlFor={`${id}-title`} className="text-sm font-semibold">{t("sf_adm_title_label")}</label>
        <input id={`${id}-title`} value={d.title} maxLength={TITLE_MAX} dir="auto" placeholder={t("sf_adm_title_ph")}
          onChange={(e) => setD({ ...d, title: e.target.value })} aria-invalid={fieldErr("title") ? true : undefined}
          aria-describedby={fieldErr("title") ? `${id}-title-err` : undefined} className="field mt-1 text-sm" />
        {fieldErr("title") && <p id={`${id}-title-err`} className="mt-1 text-sm text-destructive">{t(fieldErr("title")!)}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {input("instagram", "sf_adm_ig", "https://www.instagram.com/reel/…")}
        {input("facebook", "sf_adm_fb", "https://www.facebook.com/…")}
      </div>
      <p className="text-sm text-muted-foreground">{fieldErr("links") ? <span className="text-destructive">{t("sf_err_links")}</span> : t("sf_adm_links_hint")}</p>
      <PeoplePicker picked={picked} onChange={(p) => { setPicked(p); if (err?.field === "people") setErr(null); }} />
      {fieldErr("people") && <p className="text-sm text-destructive">{t(fieldErr("people")!)}</p>}
      <p role="note" className="rounded-xl bg-clay-soft px-3 py-2 text-sm text-clay-strong">{t("sf_adm_consent_note")}</p>
      {!post?.announcedAt && (
        <div className="flex items-start gap-3">
          <input id={`${id}-announce`} type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-sea" />
          <label htmlFor={`${id}-announce`} className="text-sm">
            <span className="font-semibold">{t("sf_adm_announce")}</span>
            <span className="block text-muted-foreground">{t("sf_adm_announce_note")}</span>
          </label>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {live ? (
          <>
            <button type="submit" disabled={busy} className="btn btn-lime min-h-10">{busy ? t("loading") : t("save")}</button>
            {announce && !post?.announcedAt && (
              <button type="button" disabled={busy} onClick={() => void submit(true)} className="btn btn-outline min-h-10"><Megaphone className="size-4" aria-hidden />{t("sf_adm_announce")}</button>
            )}
          </>
        ) : (
          <>
            <button type="submit" disabled={busy} className="btn btn-lime min-h-10"><Send className="size-4 rtl:-scale-x-100" aria-hidden />{busy ? t("loading") : t("sf_adm_publish")}</button>
            <button type="button" disabled={busy} onClick={() => void submit(false)} className="btn btn-outline min-h-10">{t("sf_adm_save_draft")}</button>
          </>
        )}
        <button type="button" disabled={busy} onClick={onDone} className="btn btn-ghost min-h-10">{t("cancel")}</button>
      </div>
    </form>
  );
}

function PostRow({ post, onEdit }: { post: AdminPost; onEdit: () => void }) {
  const { t } = useI18n();
  const date = useDate();
  const { remove } = useAdminSocialActions();
  const [confirming, setConfirming] = useState(false);
  const c = consentSummary(post.people);
  return (
    <li className="flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row">
      <Poster platforms={platformsOf(post)} compact />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 dir="auto" className="font-bold">{post.title}</h3>
          <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${post.publishedAt ? "bg-sea-soft text-sea" : "bg-muted text-muted-foreground"}`}>
            {t(post.publishedAt ? "sf_adm_live" : "sf_adm_draft")}
          </span>
          {post.announcedAt && <span className="rounded-full bg-clay-soft px-2 py-0.5 text-sm font-semibold text-clay-strong">{t("sf_adm_announced")}</span>}
        </div>
        {post.publishedAt && <p className="text-sm text-muted-foreground"><time dateTime={post.publishedAt}>{t("sf_published_on", { d: date(post.publishedAt) })}</time></p>}
        {post.people.length ? (
          <>
            <ul className="flex flex-wrap gap-1.5">
              {post.people.map((p) => (
                <li key={p.id} className="flex items-center gap-1.5 rounded-full border py-0.5 pe-2.5 ps-0.5 text-sm">
                  <Avatar src={p.avatar} name={p.name} size="sm" />
                  <span dir="auto" className="font-semibold">{p.name}</span>
                  <span className={`rounded-full px-1.5 ${STATE[p.choice].cls}`}>{t(STATE[p.choice].key)}</span>
                </li>
              ))}
            </ul>
            {post.publishedAt && <p className="text-sm text-muted-foreground">{t("sf_adm_consent", { s: c.shown, h: c.hidden, p: c.pending })}</p>}
          </>
        ) : <p className="text-sm text-muted-foreground">{t("sf_adm_nobody")}</p>}
        <WatchLinks post={post} />
      </div>
      <div className="flex shrink-0 flex-wrap items-start gap-2 sm:flex-col">
        <button type="button" onClick={onEdit} className="btn btn-outline min-h-10 text-sm"><Pencil className="size-4" aria-hidden />{t("sf_adm_edit")}</button>
        {confirming ? (
          <div role="group" aria-label={t("sf_adm_delete_confirm")} className="w-full max-w-xs space-y-2 rounded-2xl border bg-surface-sunken p-3">
            <p className="text-sm font-semibold">{t("sf_adm_delete_confirm")}</p>
            <div className="flex gap-2">
              <button type="button" disabled={remove.isPending} className="btn btn-danger min-h-10"
                onClick={() => remove.mutate(post.id, { onError: (e) => toast.error(t(socialErrorKey(e))) })}>{t("confirm_yes")}</button>
              <button type="button" onClick={() => setConfirming(false)} className="btn btn-ghost min-h-10">{t("cancel")}</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="btn btn-ghost min-h-10 text-sm text-destructive"><Trash2 className="size-4" aria-hidden />{t("delete")}</button>
        )}
      </div>
    </li>
  );
}

/** Operator panel on /admin (VITE_SOCIAL_FEATURES + VITE_ADMIN): posts list + editor. The database is the gate. */
export function AdminSocialPosts() {
  const { t } = useI18n();
  const q = useQuery(adminSocialPostsQuery());
  // null = closed, "new" = a new post, else the id being edited.
  const [editing, setEditing] = useState<string | null>(null);
  if (!SOCIAL_ADMIN_ENABLED) return null;
  const posts = q.data ?? [];
  return (
    <section id="social" aria-labelledby="adm-social-t" className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 id="adm-social-t" className="flex items-center gap-2 text-lg font-bold"><Clapperboard className="size-5 text-clay-strong" aria-hidden />{t("sf_adm_title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("sf_adm_sub")}</p>
        </div>
        {editing === null && <button type="button" onClick={() => setEditing("new")} className="btn btn-ink min-h-10"><Plus className="size-4" aria-hidden />{t("sf_adm_new")}</button>}
      </div>
      <div className="mt-5 space-y-4">
        {editing === "new" && <PostEditor post={null} onDone={() => setEditing(null)} />}
        {q.isLoading ? <ListSkeleton rows={2} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !posts.length ? (
          editing === null && <p className="text-sm text-muted-foreground">{t("sf_adm_empty")}</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => editing === p.id
              ? <li key={p.id}><PostEditor post={p} onDone={() => setEditing(null)} /></li>
              : <PostRow key={p.id} post={p} onEdit={() => setEditing(p.id)} />)}
          </ul>
        )}
      </div>
    </section>
  );
}

