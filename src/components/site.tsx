import { Link, useRouterState } from "@tanstack/react-router";
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, X, MapPin, Wifi, Star, BadgeCheck, Sun, Moon, Monitor, Home, Search, MessageSquare, User, PlusCircle, ChevronDown, LayoutDashboard, Briefcase, Settings, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { profileQuery } from "@/lib/profiles-db";
import { useTheme, type ThemePref } from "@/lib/theme";
import { LANGS, useI18n } from "@/lib/i18n";
import { CATEGORIES, type Service } from "@/lib/data";
import { isNew } from "@/lib/explore-filters";
import { useViewTransitions, vtName } from "@/lib/view-transitions";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useSignOut } from "@/lib/auth";
import { publishedServicesQuery } from "@/lib/services-db";
import { CATEGORY_ICONS, PointerField } from "@/components/brand";
import { peek } from "@/lib/peek";

// Loaded on first open only, so cmdk stays out of every page's initial bundle.
const SearchPalette = lazy(() => import("@/components/search-palette").then((m) => ({ default: m.SearchPalette })));
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Real published services only — no sample data. */
/** `initial` = the list the server rendered with (Explore), so the first browser render matches the HTML. */
export function useAllServices(initial?: Service[] | null) {
  const q = useQuery(initial ? { ...publishedServicesQuery, initialData: initial } : publishedServicesQuery);
  return { services: q.data ?? [], isLoading: q.isLoading, isError: q.isError, refetch: q.refetch };
}

/** Independent, directly selectable theme buttons (no dropdown). */
export function ThemeSwitcher({ dark = false }: { dark?: boolean }) {
  const { t } = useI18n();
  const { pref, setPref } = useTheme();
  const opts: { v: ThemePref; icon: typeof Sun; label: string }[] = [
    { v: "light", icon: Sun, label: t("theme_light") },
    { v: "dark", icon: Moon, label: t("theme_dark") },
    { v: "system", icon: Monitor, label: t("theme_system") },
  ];
  return (
    <div role="group" aria-label={t("theme_group")} className={`seg ${dark ? "seg-dark" : ""}`}>
      {opts.map((o) => (
        <button key={o.v} type="button" aria-pressed={pref === o.v} aria-label={o.label} title={o.label} onClick={() => setPref(o.v)} className="seg-btn seg-icon">
          <o.icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}

export function BottomNav() {
  const { t } = useI18n();
  const { user } = useAuth();
  const items = [
    { to: "/", label: t("nav_home"), icon: Home, exact: true },
    { to: "/explore", label: t("nav_explore"), icon: Search },
    { to: "/messages", label: t("messages"), icon: MessageSquare },
    { to: user ? "/dashboard" : "/login", label: t("my_account"), icon: User },
    { to: "/offer", label: t("nav_offer"), icon: PlusCircle },
  ] as const;
  return (
    <nav aria-label={t("nav_main")} className="bottom-nav pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((it) => (
          <li key={it.to + it.label}>
            <Link
              to={it.to}
              activeOptions={{ exact: "exact" in it }}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold text-muted-foreground transition-colors"
              activeProps={{ className: "text-sea", "aria-current": "page" }}
            >
              <it.icon className="size-5" aria-hidden />
              <span className="max-w-full truncate">{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function AccountActions({ mobile, close }: { mobile?: boolean; close?: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const signOut = useSignOut();
  if (user)
    return (
      <>
        <Link to="/messages" onClick={close} className={mobile ? "btn btn-ghost-dark" : "text-sm font-semibold text-navy-foreground"}>{t("messages")}</Link>
        <Link to="/dashboard" onClick={close} className="btn btn-lime">{t("dashboard")}</Link>
        <button onClick={() => { close?.(); void signOut(); }} className={mobile ? "btn btn-ghost-dark" : "text-sm text-navy-muted hover:text-navy-foreground"}>{t("logout")}</button>
      </>
    );
  return (
    <>
      <Link to="/login" onClick={close} className={mobile ? "btn btn-ghost-dark" : "text-sm font-semibold text-navy-foreground"}>{t("login")}</Link>
      <Link to="/signup" onClick={close} className="btn btn-lime">{t("signup")}</Link>
    </>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="logo-link flex shrink-0 items-center gap-2" aria-label="SkillLoop">
      <svg width="34" height="18" viewBox="0 0 34 18" fill="none" aria-hidden>
        <path d="M9 2a7 7 0 1 0 0 14c4 0 6-3.5 8-7s4-7 8-7a7 7 0 1 1 0 14c-4 0-6-3.5-8-7S13 2 9 2Z" className="stroke-clay" strokeWidth="3.2" />
        <path d="M25 2c-4 0-6 3.5-8 7" className="stroke-lime" strokeWidth="3.2" strokeLinecap="round" />
        {/* Hover/focus: the lime spark runs one lap of the loop, echoing the homepage hero. */}
        <path d="M9 2a7 7 0 1 0 0 14c4 0 6-3.5 8-7s4-7 8-7a7 7 0 1 1 0 14c-4 0-6-3.5-8-7S13 2 9 2Z" pathLength={1} strokeDasharray="0.16 0.84" className="logo-spark stroke-lime" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
      <span dir="ltr" className={`text-xl font-extrabold tracking-tight ${light ? "text-navy-foreground" : "text-foreground"}`}>
        Skill<span className="text-lime">Loop</span>
      </span>
    </Link>
  );
}

/** Inline SVG flags (emoji flags don't render on Windows). */
function Flag({ code }: { code: "fr" | "en" | "ar" }) {
  const cls = "h-4 w-6 rounded-[3px] shadow-sm";
  if (code === "fr")
    return (<svg viewBox="0 0 3 2" className={cls} aria-hidden><rect width="1" height="2" fill="#002654" /><rect x="1" width="1" height="2" fill="#fff" /><rect x="2" width="1" height="2" fill="#ce1126" /></svg>);
  if (code === "en")
    return (
      <svg viewBox="0 0 60 30" className={cls} aria-hidden preserveAspectRatio="none">
        <clipPath id="uk-c"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk-c)" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </svg>
    );
  return (
    <svg viewBox="0 0 30 20" className={cls} aria-hidden>
      <rect width="30" height="20" fill="#e70013" />
      <circle cx="15" cy="10" r="5" fill="#fff" />
      <circle cx="15.6" cy="10" r="3.6" fill="#e70013" />
      <circle cx="16.6" cy="10" r="2.9" fill="#fff" />
      <path d="M14.4 10 l3.3-1.1 -2 2.8 v-3.4 l2 2.8 z" fill="#e70013" />
    </svg>
  );
}

/** Independent, directly selectable flag buttons (no dropdown); each has its language name as accessible label. Switching keeps route and inputs. */
export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t("lang_group")} className={`seg seg-lang ${dark ? "seg-dark" : ""}`}>
      {LANGS.map((l) => (
        <button key={l.code} type="button" lang={l.code} aria-pressed={lang === l.code} aria-label={l.label} title={l.label} onClick={() => setLang(l.code)} className="seg-btn">
          <Flag code={l.code} />
        </button>
      ))}
    </div>
  );
}

/** Language + appearance in one compact menu (radio items, keyboard accessible). Switching keeps route and inputs. */
function PreferencesMenu() {
  const { lang, setLang, t } = useI18n();
  const { pref, setPref } = useTheme();
  const themes: { v: ThemePref; icon: typeof Sun; key: "theme_light" | "theme_dark" | "theme_system" }[] = [
    { v: "light", icon: Sun, key: "theme_light" }, { v: "dark", icon: Moon, key: "theme_dark" }, { v: "system", icon: Monitor, key: "theme_system" },
  ];
  const ThemeIcon = themes.find((x) => x.v === pref)?.icon ?? Monitor;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={t("prefs_label")} title={t("prefs_label")}
        className="flex h-10 items-center gap-2 rounded-full border border-navy-foreground/15 bg-navy-foreground/5 px-3 text-navy-foreground transition-colors hover:bg-navy-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime">
        <Flag code={lang} />
        <ThemeIcon className="size-4 text-navy-muted" aria-hidden />
        <ChevronDown className="size-3.5 text-navy-muted" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t("lang_group")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={lang} onValueChange={(v) => setLang(v as typeof lang)}>
          {LANGS.map((l) => (
            <DropdownMenuRadioItem key={l.code} value={l.code} lang={l.code} className="gap-2 rounded-xl py-2">
              <Flag code={l.code} />{l.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t("theme_group")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={pref} onValueChange={(v) => setPref(v as ThemePref)}>
          {themes.map((o) => (
            <DropdownMenuRadioItem key={o.v} value={o.v} className="gap-2 rounded-xl py-2">
              <o.icon className="size-4" aria-hidden />{t(o.key)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Desktop right side: compact messages + avatar menu when signed in; login/signup otherwise. */
function DesktopAccount() {
  const { t } = useI18n();
  const { user } = useAuth();
  if (!user) return <AccountActions />;
  return (
    <>
      <Link to="/messages" aria-label={t("messages")} title={t("messages")}
        className="grid size-10 place-items-center rounded-full text-navy-muted transition-colors hover:bg-navy-foreground/10 hover:text-navy-foreground"
        activeProps={{ className: "bg-navy-foreground/10 text-navy-foreground", "aria-current": "page" }}>
        <MessageSquare className="size-5" aria-hidden />
      </Link>
      <AccountMenu />
    </>
  );
}

/** Signed-in account: the user's photo (or initial) opens their space; everything account-related lives here. */
function AccountMenu() {
  const { t } = useI18n();
  const { user } = useAuth();
  const signOut = useSignOut();
  const prof = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user });
  if (!user) return null;
  const name = prof.data?.display_name || user.email?.split("@")[0] || "—";
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`${t("account_menu")} · ${name}`} title={name}
        className="flex items-center gap-1.5 rounded-full p-0.5 pe-2 transition-colors hover:bg-navy-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime">
        {prof.data?.avatar
          ? <img src={prof.data.avatar} alt="" className="avatar-ring m-0.5 size-8 rounded-full object-cover" />
          : <span aria-hidden className="avatar-ring m-0.5 grid size-8 place-items-center rounded-full bg-clay-soft text-sm font-bold text-clay-strong">{initial}</span>}
        <ChevronDown className="size-3.5 text-navy-muted" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5">
        <div className="px-2 py-2">
          <p dir="auto" className="truncate text-sm font-bold">{name}</p>
          {user.email && <p dir="ltr" className="truncate text-start text-xs text-muted-foreground">{user.email}</p>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2 rounded-xl py-2"><Link to="/dashboard"><LayoutDashboard className="size-4" aria-hidden />{t("dashboard")}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2 rounded-xl py-2"><Link to="/pros/$id" params={{ id: user.id }}><User className="size-4" aria-hidden />{t("view_public_profile")}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2 rounded-xl py-2"><Link to="/profile" search={{ space: "pro", tab: "services" }}><Briefcase className="size-4" aria-hidden />{t("my_services")}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2 rounded-xl py-2"><Link to="/profile" search={{ tab: "settings" }}><Settings className="size-4" aria-hidden />{t("settings")}</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => { void signOut(); }} className="gap-2 rounded-xl py-2 text-destructive focus:text-destructive"><LogOut className="size-4" aria-hidden />{t("logout")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Desktop nav with one lime indicator under the current page that slides to the link under the mouse/keyboard focus and
 * back (idea from VengeanceUI "Spotlight Navbar"; own CSS, no Motion). Moves by transform, shows by opacity; measured, so
 * RTL-safe; jumps instead of sliding under reduced motion. Decorative: the active link is already marked (aria-current).
 */
function DesktopNav({ links }: { links: readonly { to: string; label: string }[] }) {
  const nav = useRef<HTMLElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const place = useCallback((el: Element | null) => {
    const n = nav.current, b = bar.current;
    if (!n || !b) return;
    if (!el) { b.removeAttribute("data-on"); return; }
    const a = n.getBoundingClientRect(), r = el.getBoundingClientRect();
    const shown = b.hasAttribute("data-on");
    if (!shown) b.setAttribute("data-jump", "");
    b.style.width = `${r.width}px`;
    b.style.transform = `translate3d(${r.left - a.left}px, 0, 0)`;
    if (!shown) { void b.offsetWidth; b.removeAttribute("data-jump"); }
    b.setAttribute("data-on", "");
  }, []);
  const toActive = useCallback(() => place(nav.current?.querySelector('[data-status="active"]') ?? null), [place]);
  useIsoLayoutEffect(() => { toActive(); }, [pathname, toActive]);
  useEffect(() => {
    window.addEventListener("resize", toActive);
    void document.fonts?.ready.then(toActive);
    return () => window.removeEventListener("resize", toActive);
  }, [toActive]);
  return (
    <nav
      ref={nav}
      className="relative hidden items-center gap-6 lg:flex"
      onPointerOver={(e) => { const l = (e.target as Element).closest("a"); if (l && e.pointerType !== "touch") place(l); }}
      onPointerLeave={toActive}
      onFocus={(e) => place(e.target)}
      onBlur={toActive}
    >
      {links.map((l) => (
        <Link key={l.to} to={l.to} className="text-sm text-navy-muted transition-colors hover:text-navy-foreground" activeProps={{ className: "text-navy-foreground font-semibold" }}>
          {l.label}
        </Link>
      ))}
      <span ref={bar} aria-hidden className="nav-indicator" />
    </nav>
  );
}

export function SiteHeader() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [searchLoaded, setSearchLoaded] = useState(false);
  const [mac, setMac] = useState(false);
  const openSearch = useCallback((v: boolean) => { if (v) setSearchLoaded(true); setSearch(v); }, []);
  const toggleSearch = useCallback(() => { setSearchLoaded(true); setSearch((v) => !v); }, []);
  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") { e.preventDefault(); toggleSearch(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSearch]);
  const links = [
    { to: "/explore", label: t("nav_explore") },
    { to: "/how-it-works", label: t("nav_how") },
    { to: "/professionals", label: t("nav_pros") },
    { to: "/about", label: t("nav_about") },
  ] as const;
  return (
    <header className="sticky top-0 z-40 border-b border-navy-foreground/10 bg-navy/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo light />
        <DesktopNav links={links} />
        <div className="hidden items-center gap-4 lg:flex">
          <button type="button" onClick={() => openSearch(true)} aria-haspopup="dialog" aria-keyshortcuts={mac ? "Meta+K" : "Control+K"} className="search-trigger">
            <Search className="size-4" aria-hidden />{t("sp_open")}
            <kbd className="search-kbd" aria-hidden>{mac ? "⌘K" : "Ctrl K"}</kbd>
          </button>
          <PreferencesMenu />
          <DesktopAccount />
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <button type="button" className="grid size-11 place-items-center rounded-full text-navy-foreground" aria-label={t("sp_open")} aria-haspopup="dialog" onClick={() => openSearch(true)}>
            <Search className="size-5" aria-hidden />
          </button>
          <button className="grid size-11 place-items-center rounded-full text-navy-foreground" aria-label={t("menu")} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-navy-foreground/10 px-4 pb-6 pt-2 lg:hidden">
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="py-3 text-base text-navy-foreground">{l.label}</Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <LanguageSwitcher dark />
              <ThemeSwitcher dark />
            </div>
            <AccountActions mobile close={() => setOpen(false)} />
          </div>
        </div>
      )}
      {searchLoaded && <Suspense fallback={null}><SearchPalette open={search} onOpenChange={openSearch} /></Suspense>}
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  const link = "line-link inline-flex min-h-9 items-center hover:text-navy-foreground";
  return (
    <footer className="relative overflow-hidden bg-navy text-navy-muted">
      <PointerField />
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-3 max-w-xs text-sm">{t("footer_tag")}</p>
        </div>
        <nav aria-label={t("ft_explore")} className="flex flex-col text-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-foreground">{t("ft_explore")}</h2>
          <Link to="/explore" className={link}>{t("hp_cats_all")}</Link>
          <Link to="/explore" search={{ mode: "remote" }} className={link}>{t("hp_loc_remote")}</Link>
          <Link to="/explore" search={{ mode: "inperson" }} className={link}>{t("hp_loc_inperson")}</Link>
        </nav>
        <nav aria-label={t("ft_providers")} className="flex flex-col text-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-foreground">{t("ft_providers")}</h2>
          <Link to="/offer" className={link}>{t("offer_service")}</Link>
          <Link to="/professionals" className={link}>{t("nav_pros")}</Link>
          <Link to="/dashboard" className={link}>{t("dashboard")}</Link>
        </nav>
        <nav aria-label={t("ft_company")} className="flex flex-col text-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-foreground">{t("ft_company")}</h2>
          <Link to="/how-it-works" className={link}>{t("nav_how")}</Link>
          <Link to="/about" className={link}>{t("nav_about")}</Link>
          <Link to="/messages" className={link}>{t("messages")}</Link>
          <Link to="/privacy" className={link}>{t("privacy_title")}</Link>
          <Link to="/terms" className={link}>{t("terms_title")}</Link>
        </nav>
      </div>
      <div className="relative border-t border-navy-foreground/10 py-5 text-center text-xs">© 2026 SkillLoop. {t("footer_rights")}</div>
    </footer>
  );
}

export function formatPrice(n: number, lang: string) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-TN" : lang === "en" ? "en-TN" : "fr-TN", { maximumFractionDigits: 0 }).format(n) + (lang === "ar" ? " د.ت" : " TND");
}

export function ServiceCard({ s }: { s: Service }) {
  const { t, lang } = useI18n();
  const vt = useViewTransitions();
  const cat = CATEGORIES.find((c) => c.id === s.category);
  const CatIcon = CATEGORY_ICONS[s.category] ?? CATEGORY_ICONS.other;
  return (
    <Link to="/services/$id" params={{ id: s.id }} viewTransition={vt} className="listing-card group">
      {/* The photo continues into the service page's photo (same view-transition name). */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted" style={s.hasPhoto && s.real ? { viewTransitionName: vtName("svc", s.id) } : undefined}>
        {s.hasPhoto ? (
          <img src={s.image} alt="" loading="lazy" width={944} height={704} className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]" />
        ) : (
          // No provider photo: a branded category tile instead of a stock image that could read as their work.
          <span className="media-fallback">
            <CatIcon className="size-10" aria-hidden />
            <span className="mt-6 rounded-full bg-card/80 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{t("card_no_photo")}</span>
          </span>
        )}
        {s.description.trim() && (
          <span aria-hidden className="card-peek"><span dir="auto">{peek(s.description)}</span></span>
        )}
        {cat && <span className="tag tag-ink absolute start-3 top-3"><CatIcon className="size-3.5 text-lime" aria-hidden />{t(cat.key)}</span>}
        {s.verified && (
          <span className="badge badge-success absolute end-3 top-3"><BadgeCheck className="size-3.5" aria-hidden />{t("verified")}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {s.real && isNew(s) && <span className="tag tag-new w-fit">{t("badge_new")}</span>}
        <h3 dir="auto" className="line-clamp-2 text-[1.05rem] font-bold leading-snug">{s.title}</h3>
        <p className="text-sm">
          <span dir="auto" className="font-semibold">{s.provider}</span>
          {s.profession && <span dir="auto" className="text-muted-foreground"> · {s.profession}</span>}
        </p>
        {s.rating && s.rating.count > 0 && (
          <p className="flex items-center gap-1 text-sm">
            <Star className="size-4 fill-current text-lime" aria-hidden />
            <span>{t("rating_of", { r: s.rating.avg.toFixed(1), n: s.rating.count })}</span>
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 border-t pt-3">
          <span className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="size-3.5 shrink-0" aria-hidden /><span dir="auto" className="truncate">{s.city}</span></span>
            <span className="flex items-center gap-1">
              {s.remote ? <Wifi className="size-3.5 shrink-0" aria-hidden /> : <User className="size-3.5 shrink-0" aria-hidden />}
              {s.remote ? t("remote") : t("on_site")}
            </span>
          </span>
          <span className="shrink-0 text-end">
            {s.quoteOnly ? (
              <span className="block font-bold text-clay-strong">{t("pm_quote")}</span>
            ) : s.priceMissing ? (
              <span className="block text-sm font-semibold text-muted-foreground">{t("sd_price_missing")}</span>
            ) : (
              <>
                {s.unit === "pm_from" && <span className="block text-[11px] text-muted-foreground">{t("price_from")}</span>}
                <span className="block text-lg font-extrabold tabular-nums leading-tight">{formatPrice(s.price, lang)}</span>
                {s.unit !== "pm_from" && <span className="block text-[11px] text-muted-foreground">{t(s.unit)}</span>}
              </>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-card" aria-hidden>
      <div className="skeleton-block aspect-[4/3] rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <div className="skeleton-block h-5 w-3/4" />
        <div className="skeleton-block h-4 w-1/2" />
        <div className="skeleton-block mt-3 h-4 w-1/3" />
      </div>
    </div>
  );
}

export function PageHero({ title, sub }: { title: string; sub?: string }) {
  return (
    <section className="bg-hero relative overflow-hidden text-navy-foreground">
      <PointerField />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        <h1 className="display-title text-3xl md:text-[2.75rem]">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-navy-muted">{sub}</p>}
      </div>
    </section>
  );
}
