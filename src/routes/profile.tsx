import { createFileRoute, Link } from "@tanstack/react-router";
import { limitMessage } from "@/lib/limits";
import { rememberCurrentPage } from "@/lib/return-to";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Archive, ArchiveRestore, AtSign, Briefcase, ExternalLink, Handshake, Hourglass, Images as ImagesIcon, Inbox, LayoutDashboard, MapPin, NotebookPen, Palette, PanelTop, Pencil, PlusCircle, Search, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { LANGS, savedLangChange, useI18n, type TKey } from "@/lib/i18n";
import { CATEGORIES, CITIES } from "@/lib/data";
import { PageHero } from "@/components/site";
import { DashHero, SegSlide, ServiceTile, StatTile } from "@/components/dash-kit";
import { useActiveSection } from "@/components/motion-kit";
import { BrandBackdrop } from "@/components/brand";
import { Avatar } from "@/components/media-viewer";
import { seo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { myRequestsQuery } from "@/lib/requests-db";
import { profileQuery } from "@/lib/profiles-db";
import { PhotoPicker } from "@/components/photo-picker";
import { AVATAR_PRESETS, AVATAR_SIZE } from "@/lib/presets";
import { CarnetEditor, ContactsEditor, PortfolioEditor } from "@/components/profile-editors";
import { ThemePicker } from "@/components/pro-tools";
import { BannerPicker } from "@/components/banner-picker";
import { PRO_TOOLS_ENABLED } from "@/lib/pro-tools";
import { DeleteAccount } from "@/components/delete-account";
import { RequestActions } from "@/components/request-actions";
import { signImages } from "@/lib/services-db";
import { saveProfile, setServiceArchived, validateProfile } from "@/lib/marketplace-writes";
import { EmptyState, ErrorState, ListingSketch, ListSkeleton, StartShortcuts, StatusBadge } from "@/components/states";

const TABS = ["requests", "received", "services", "settings"] as const;
const SPACES = { client: ["requests", "settings"], pro: ["services", "received", "settings"] } as const;
export const Route = createFileRoute("/profile")({
  validateSearch: z.object({ tab: z.enum(TABS).optional().catch(undefined), space: z.enum(["client", "pro"]).optional().catch(undefined) }),
  head: () => seo("Tableau de bord", "Gérez vos services, demandes et paramètres SkillLoop.", { noindex: true }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const { user, ready } = useAuth();
  const search = Route.useSearch();
  const space = search.space ?? (search.tab === "services" || search.tab === "received" ? "pro" : "client");
  const tabs = SPACES[space] as readonly (typeof TABS)[number][];
  const tab = search.tab && tabs.includes(search.tab) ? search.tab : tabs[0];
  const me = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user });
  if (!ready) return <p className="py-24 text-center text-muted-foreground">{t("loading")}</p>;
  if (!user)
    return (
      <>
        <PageHero title={t("dashboard")} />
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <LayoutDashboard className="mx-auto size-12 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-muted-foreground">{t("profile_signin")}</p>
          <Link to="/login" onClick={rememberCurrentPage} className="btn btn-lime mt-6">{t("login")}</Link>
        </div>
      </>
    );
  const labels = { requests: t("my_requests"), received: t("received_requests"), services: t("my_services"), settings: t("settings") };
  const name = me.data?.display_name || user.email?.split("@")[0] || "";
  return (
    <>
      <DashHero name={name} avatar={me.data?.avatar ?? undefined} eyebrow={t(space === "client" ? "space_client" : "space_pro")} sub={tab === "settings" ? t("dh_sub_settings") : (user.email ?? "")}>
        <SegSlide index={space === "client" ? 0 : 1} count={2} label={t("dashboard")}>
          {(["client", "pro"] as const).map((sp) => (
            <Link key={sp} to="/profile" search={{ space: sp }} aria-current={space === sp ? "page" : undefined}>{t(sp === "client" ? "space_client" : "space_pro")}</Link>
          ))}
        </SegSlide>
        <Link to="/pros/$id" params={{ id: user.id }} className="dash-action"><ExternalLink className="size-4" aria-hidden />{t("view_public_profile")}</Link>
        <Link to="/dashboard" className="dash-action"><LayoutDashboard className="size-4" aria-hidden />{t("dashboard")}</Link>
      </DashHero>
      <nav className="dash-tabs sd-sticky-shadow" aria-label={t(space === "client" ? "space_client" : "space_pro")}>
        <ul className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 sm:px-6">
          {tabs.map((k) => (
            <li key={k}><Link to="/profile" search={{ space, tab: k }} aria-current={tab === k ? "page" : undefined} className="dash-tab">{labels[k]}</Link></li>
          ))}
        </ul>
      </nav>
      <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        {space === "pro" && tab !== "settings" && <ProStats userId={user.id} />}
        <div className="mt-8">
          {(tab === "requests" || tab === "received") && <Requests userId={user.id} received={tab === "received"} />}
          {tab === "services" && <MyServices userId={user.id} />}
          {tab === "settings" && <Settings userId={user.id} />}
        </div>
      </div>
    </>
  );
}

function Requests({ userId, received }: { userId: string; received: boolean }) {
  const { t } = useI18n();
  const q = useQuery(myRequestsQuery(userId));
  const list = (q.data ?? []).filter((r) => (received ? r.provider_id === userId : r.client_id === userId));
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!list.length)
    return <EmptyState icon={Inbox} title={t("db_no_requests")} sub={t(received ? "db_no_requests_pro" : "db_no_requests_client")}
      action={received ? <Link to="/profile" search={{ tab: "settings" }} className="btn btn-outline">{t("db_edit_profile")}</Link> : <><Link to="/explore" className="btn btn-ink"><Search className="size-4" aria-hidden />{t("explore_services")}</Link><div className="w-full"><StartShortcuts /></div></>} />;
  return (
    <ul className="sd-stagger space-y-3">
      {list.map((r) => (
        <li key={r.id} className="row-card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0">
            <Link to="/messages" search={{ r: r.id }} dir="auto" className="stretched-link block font-semibold">{r.services?.title}</Link>
            <p className="text-sm text-muted-foreground">{received ? t("from_client") : t("to_provider")} <span dir="auto">{(received ? r.client?.display_name : r.provider?.display_name) || t("account_deleted_name")}</span></p>
            <p dir="auto" className="mt-1 line-clamp-2 text-sm">{r.message}</p>
          </div>
          <div className="relative z-[2] flex items-center gap-3">
            <StatusBadge status={r.status} />
            {received && <RequestActions req={r} userId={userId} />}
            <Link to="/messages" search={{ r: r.id }} className="btn btn-outline">{t("open_chat")}</Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

function MyServices({ userId }: { userId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["services", "mine", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("id, title, category, city, created_at, status, image_url, archived").eq("owner_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      const urls = await signImages(data.map((d) => d.image_url).filter((x): x is string => !!x));
      return data.map((d) => ({ ...d, img: d.image_url ? urls[d.image_url] : undefined }));
    },
  });
  const toggle = async (id: string, status: string) => {
    const { error } = await supabase.from("services").update({ status: status === "published" ? "draft" : "published" }).eq("id", id);
    if (error) { const lim = limitMessage(error); toast.error(lim ? t(lim.key, lim.vars) : t("err_generic")); return; }
    qc.invalidateQueries({ queryKey: ["services"] });
    qc.invalidateQueries({ queryKey: ["plan"] }); // a first publication starts the free month
  };
  const archive = async (id: string, archived: boolean) => {
    if (archived && !confirm(t("confirm_archive"))) return;
    const err = await setServiceArchived(supabase, id, archived);
    if (err) { const lim = limitMessage(err); toast.error(lim ? t(lim.key, lim.vars) : t("err_generic")); return; }
    qc.invalidateQueries({ queryKey: ["services"] });
  };
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  return (
    <div>
      <Link to="/offer" className="btn btn-lime" data-magnetic><PlusCircle className="size-4" aria-hidden />{t("offer_service")}</Link>
      {!q.data?.length ? <div className="mt-4"><EmptyState icon={Briefcase} title={t("db_no_services")} sub={t("db_no_services_sub")} action={<ListingSketch />} /></div> : (
        <ul className="sd-stagger mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((s) => (
            <ServiceTile key={s.id} s={s} actions={
              <>
                <Link to="/offer" search={{ edit: s.id }} aria-label={`${t("edit_service")} · ${s.title}`} title={t("edit_service")} className="btn btn-outline min-h-10 px-3"><Pencil className="size-4" aria-hidden /></Link>
                {!s.archived && <button type="button" onClick={() => toggle(s.id, s.status)} className={`btn min-h-10 flex-1 ${s.status === "published" ? "btn-outline" : "btn-lime"}`}>{t(s.status === "published" ? "to_draft" : "to_publish")}</button>}
                <button type="button" aria-label={t(s.archived ? "restore" : "archive")} title={t(s.archived ? "restore" : "archive")} className="btn btn-outline min-h-10 px-3" onClick={() => archive(s.id, !s.archived)}>
                  {s.archived ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
                </button>
              </>
            } />
          ))}
        </ul>
      )}
    </div>
  );
}

function Settings({ userId }: { userId: string }) {
  const q = useQuery(profileQuery(userId));
  if (q.isLoading) return <ListSkeleton rows={3} />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  // The form only mounts with loaded data, so it can never save blanks over the real profile or overwrite typing.
  return (
    <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <SettingsNav />
      <div className="min-w-0 space-y-8">
        <SettingsForm userId={userId} p={q.data} />
        <BannerPicker userId={userId} details={q.data.professional_details} />
        <CarnetEditor userId={userId} details={q.data.professional_details} />
        {PRO_TOOLS_ENABLED && <ThemePicker userId={userId} details={q.data.professional_details} />}
        <PortfolioEditor userId={userId} items={q.data.portfolio} />
        <ContactsEditor userId={userId} saved={q.data.contacts} />
        <div id="account" className="scroll-mt-36"><DeleteAccount userId={userId} /></div>
      </div>
    </div>
  );
}

const SETTINGS_SECTIONS: { id: string; label: TKey; icon: typeof UserRound }[] = [
  { id: "profile-info", label: "set_profile", icon: UserRound },
  { id: "banner", label: "bn_title", icon: PanelTop },
  { id: "carnet", label: "carnet_title", icon: NotebookPen },
  ...(PRO_TOOLS_ENABLED ? [{ id: "theme", label: "ct_title" as TKey, icon: Palette }] : []),
  { id: "portfolio", label: "sd_portfolio", icon: ImagesIcon },
  { id: "contacts", label: "contacts_title", icon: AtSign },
  { id: "account", label: "set_account", icon: ShieldCheck },
];

/** Sticky section index of the settings page (scroll-spy marks the section in view). */
function SettingsNav() {
  const { t } = useI18n();
  const active = useActiveSection(SETTINGS_SECTIONS.map((x) => x.id), "-160px 0px -55% 0px");
  return (
    <nav aria-label={t("set_nav")} className="hidden h-fit lg:sticky lg:top-36 lg:block">
      <ul className="space-y-1">
        {SETTINGS_SECTIONS.map((x) => (
          <li key={x.id}>
            <a href={`#${x.id}`} aria-current={active === x.id ? "true" : undefined} className="set-nav-link">
              <span className="set-nav-icon"><x.icon className="size-4" aria-hidden /></span>{t(x.label)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

type LoadedProfile = NonNullable<Awaited<ReturnType<NonNullable<ReturnType<typeof profileQuery>["queryFn"]>>>>;

function SettingsForm({ userId, p }: { userId: string; p: LoadedProfile }) {
  const { t, setLang } = useI18n();
  const qc = useQueryClient();
  const pd = (p.professional_details && typeof p.professional_details === "object" ? p.professional_details : {}) as Record<string, unknown>;
  const [f, setF] = useState({
    display_name: p.display_name ?? "", title: p.title ?? "", bio: p.bio ?? "", city: p.city ?? "", preferred_lang: p.preferred_lang ?? "fr",
    accepting: typeof pd["accepting"] === "boolean" ? (pd["accepting"] as boolean) : null,
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const [removed, setRemoved] = useState(false);
  const [prevPath, setPrevPath] = useState<string | null>(p.avatar_url ?? null);
  const [savedLang, setSavedLang] = useState(p.preferred_lang ?? "fr");
  const [errors, setErrors] = useState<ReturnType<typeof validateProfile>>({});
  const [busy, setBusy] = useState(false);
  const up = (k: "display_name" | "title" | "bio" | "city" | "preferred_lang") => (e: { target: { value: string } }) => {
    setF((cur) => ({ ...cur, [k]: e.target.value }));
    if (k in errors) setErrors((cur) => ({ ...cur, [k]: undefined }));
  };
  // Dashboard checklist links land on #photo, #bio or #availability.
  useEffect(() => {
    const el = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.querySelector<HTMLElement>("input, textarea, select")?.focus({ preventScroll: true });
  }, []);
  const err = (k: keyof typeof errors) => errors[k] && <p id={`pf-${k}-err`} className="mt-1 text-sm text-destructive">{t(errors[k]!.key, { n: errors[k]!.n ?? "" })}</p>;
  const described = (k: keyof typeof errors, help?: string) => [help, errors[k] ? `pf-${k}-err` : ""].filter(Boolean).join(" ") || undefined;
  const avail: { v: boolean | null; key: TKey }[] = [{ v: true, key: "accepting" }, { v: false, key: "not_accepting" }, { v: null, key: "avail_unset" }];

  return (
    <div id="profile-info" className="grid scroll-mt-36 gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
    <form noValidate aria-busy={busy} className="space-y-6 panel p-6 sm:p-8" onSubmit={async (e) => {
      e.preventDefault();
      const v = validateProfile(f);
      setErrors(v);
      const first = (Object.keys(v) as (keyof typeof v)[])[0];
      if (first) { document.getElementById(`pf-${first}`)?.focus(); return; }
      setBusy(true);
      const r = await saveProfile(supabase, userId, { ...f, professional_details: pd }, { file, removePhoto: removed, previous: prevPath });
      setBusy(false);
      if (r.error !== null) { const lim = limitMessage(r.error); toast.error(lim ? t(lim.key, lim.vars) : t(r.error === "upload" ? "err_upload" : "err_generic")); return; }
      setPrevPath(r.data.avatar_url);
      setFile(null);
      setRemoved(false);
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      // Only a changed "preferred language" switches the site; saving other fields keeps the current language.
      const nextLang = savedLangChange(savedLang, f.preferred_lang);
      setSavedLang(f.preferred_lang);
      if (nextLang) setLang(nextLang);
      toast.success(t("saved"));
    }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-md text-sm text-muted-foreground">{t("settings_public_note")}</p>
        <Link to="/pros/$id" params={{ id: userId }} className="btn btn-outline min-h-10"><ExternalLink className="size-4" aria-hidden />{t("view_public_profile")}</Link>
      </div>

      <div id="photo" className="scroll-mt-36">
        <p className="text-sm font-semibold">{t("f_photo")}</p>
        <p className="mb-2 text-xs text-muted-foreground">{t("f_photo_help")}</p>
        <PhotoPicker round alt="f_photo" image={removed ? null : p.avatar ?? null} onPick={(fl) => { setFile(fl); setRemoved(!fl); }}
          presets={{ groups: [{ items: AVATAR_PRESETS }], size: AVATAR_SIZE, pick: "preset_avatar_pick", title: "preset_avatar_title", description: "preset_avatar_desc" }} />
      </div>

      <div>
        <label htmlFor="pf-display_name" className="block text-sm font-semibold">{t("f_display_name")} *</label>
        <input id="pf-display_name" dir="auto" maxLength={80} autoComplete="name" className="field mt-1.5" value={f.display_name} onChange={up("display_name")} aria-invalid={!!errors.display_name} aria-describedby={described("display_name")} />
        {err("display_name")}
      </div>
      <div>
        <label htmlFor="pf-title" className="block text-sm font-semibold">{t("f_pro_title")}</label>
        <input id="pf-title" dir="auto" maxLength={80} className="field mt-1.5" value={f.title} onChange={up("title")} aria-invalid={!!errors.title} aria-describedby={described("title")} />
        {err("title")}
      </div>
      <div id="bio" className="scroll-mt-36">
        <label htmlFor="pf-bio" className="block text-sm font-semibold">{t("f_bio")}</label>
        <textarea id="pf-bio" dir="auto" rows={5} maxLength={1000} className="field mt-1.5 py-2.5" value={f.bio} onChange={up("bio")} aria-invalid={!!errors.bio} aria-describedby={described("bio", "pf-bio-help")} />
        <div className="mt-1 flex justify-between gap-3 text-xs text-muted-foreground">
          <span id="pf-bio-help">{t("f_bio_help")}</span>
          <span aria-hidden className="shrink-0 tabular-nums">{t("char_count", { n: f.bio.length, max: 1000 })}</span>
        </div>
        {err("bio")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">{t("f_city")}
          <select className="field mt-1.5" value={f.city} onChange={up("city")}><option value="">—</option>{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="block text-sm font-semibold">{t("preferred_lang")}
          <select className="field mt-1.5" value={f.preferred_lang} onChange={up("preferred_lang")}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select>
        </label>
      </div>

      <fieldset id="availability" className="scroll-mt-36" aria-describedby="pf-avail-help">
        <legend className="text-sm font-semibold">{t("f_availability")}</legend>
        <p id="pf-avail-help" className="text-xs text-muted-foreground">{t("f_availability_help")}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {avail.map((o) => (
            <label key={String(o.v)} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${f.accepting === o.v ? "border-sea bg-sea-soft font-semibold text-sea" : "hover:bg-muted"}`}>
              <input type="radio" name="accepting" className="accent-sea" checked={f.accepting === o.v} onChange={() => setF((cur) => ({ ...cur, accepting: o.v }))} />
              {t(o.key)}
            </label>
          ))}
        </div>
      </fieldset>

      <button disabled={busy} aria-busy={busy} className="btn btn-lime" data-magnetic>{busy ? t("loading") : t("save")}</button>
    </form>
    <LivePreview name={f.display_name} title={f.title} bio={f.bio} city={f.city} accepting={f.accepting} photo={removed ? null : file ? preview : p.avatar ?? null} />
    </div>
  );
}

/** What customers will see, redrawn on every keystroke (nothing is saved until the form is). */
function LivePreview({ name, title, bio, city, accepting, photo }: { name: string; title: string; bio: string; city: string; accepting: boolean | null; photo: string | null }) {
  const { t } = useI18n();
  return (
    <aside aria-label={t("dh_live")} className="h-fit xl:sticky xl:top-36">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><span className="live-dot" aria-hidden />{t("dh_live")}</p>
      <div className="live-card" data-tilt>
        <div className="live-card-cover" aria-hidden><BrandBackdrop variant="intro" /></div>
        <div className="relative -mt-12 p-5">
          <Avatar src={photo ?? undefined} name={name || "?"} size="lg" />
          <p dir="auto" className="display-title mt-3 break-words text-xl">{name || "—"}</p>
          {title && <p dir="auto" className="break-words text-sm text-muted-foreground">{title}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {accepting !== null && <span className={`avail-chip ${accepting ? "avail-open" : "avail-closed"}`}>{t(accepting ? "avail_open" : "avail_closed")}</span>}
            {city && <span className="tag tag-sea"><MapPin className="size-3.5" aria-hidden /><span dir="auto">{city}</span></span>}
          </div>
          {bio && <p dir="auto" className="mt-3 line-clamp-4 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">{bio}</p>}
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{t("dh_live_note")}</p>
    </aside>
  );
}

function ProStats({ userId }: { userId: string }) {
  const { t } = useI18n();
  const req = useQuery(myRequestsQuery(userId));
  const svc = useQuery({
    queryKey: ["services", "count", userId],
    queryFn: async () => {
      const { count, error } = await supabase.from("services").select("id", { count: "exact", head: true }).eq("owner_id", userId).eq("status", "published").eq("archived", false);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const received = (req.data ?? []).filter((r) => r.provider_id === userId);
  return (
    <dl className="mt-8 grid gap-4 sm:grid-cols-3">
      <StatTile icon={Briefcase} value={svc.isError ? "—" : svc.data ?? 0} label={t("stat_services")} tone="var(--sea)" />
      <StatTile icon={Hourglass} value={received.filter((r) => r.status === "pending").length} label={t("stat_pending")} tone="var(--warning)" />
      <StatTile icon={Handshake} value={received.filter((r) => r.status === "accepted").length} label={t("stat_accepted")} tone="var(--success)" />
    </dl>
  );
}
