import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command as CommandPrimitive } from "cmdk";
import { ArrowRight, Clock, MapPin, PlusCircle, Search, Sparkles, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CATEGORIES, CITIES } from "@/lib/data";
import { CATEGORY_ICONS } from "@/components/brand";
import { useI18n } from "@/lib/i18n";
import { readRecent, rememberSearch } from "@/lib/recent-searches";

/**
 * Site-wide search palette (Ctrl/⌘ K, header button). Idea from VengeanceUI "Search Modal" (a port of a CodeGrid
 * experiment) — own implementation on the existing cmdk + Radix Dialog; no code copied.
 * It only routes: "Search 'x'" → /explore?q=x, a category → /explore?category=…, a city → /explore?city=…, or a page.
 * Recent searches stay on this device (localStorage, at most 5); nothing is sent anywhere.
 */
const item = "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm aria-selected:bg-surface-sunken data-[selected=true]:bg-surface-sunken";

export function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { if (open) { setRecent(readRecent()); setQ(""); } }, [open]);

  const go = (fn: () => void) => { onOpenChange(false); fn(); };
  const search = (text: string) => go(() => { rememberSearch(text); navigate({ to: "/explore", search: { q: text.trim().slice(0, 120) } }); });
  const query = q.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[8vh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:top-[12vh]">
        <DialogTitle className="sr-only">{t("sp_title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("sp_desc")}</DialogDescription>
        <CommandPrimitive label={t("sp_title")} className="flex flex-col">
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <CommandPrimitive.Input
              value={q}
              onValueChange={setQ}
              dir="auto"
              maxLength={120}
              placeholder={t("sp_placeholder")}
              className="h-14 w-full bg-transparent pe-8 text-base outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandPrimitive.List className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
            <CommandPrimitive.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">{t("sp_empty")}</CommandPrimitive.Empty>
            {query && (
              <CommandPrimitive.Item forceMount value={`__search ${query}`} onSelect={() => search(query)} className={`${item} font-semibold`}>
                <span className="icon-well-sea size-8"><Search className="size-4" aria-hidden /></span>
                <span className="min-w-0 flex-1 truncate">{t("sp_for", { q: query })}</span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" aria-hidden />
              </CommandPrimitive.Item>
            )}
            {!query && recent.length > 0 && (
              <CommandPrimitive.Group heading={t("sp_recent")} className="sp-group">
                {recent.map((r) => (
                  <CommandPrimitive.Item key={r} value={`recent ${r}`} onSelect={() => search(r)} className={item}>
                    <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span dir="auto" className="min-w-0 flex-1 truncate">{r}</span>
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            )}
            <CommandPrimitive.Group heading={t("sp_cats")} className="sp-group">
              {CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c.id];
                return (
                  <CommandPrimitive.Item key={c.id} value={`cat ${t(c.key)}`} onSelect={() => go(() => navigate({ to: "/explore", search: { category: c.id } }))} className={item}>
                    <span className="icon-well-clay size-8"><Icon className="size-4" aria-hidden /></span>
                    {t(c.key)}
                  </CommandPrimitive.Item>
                );
              })}
            </CommandPrimitive.Group>
            <CommandPrimitive.Group heading={t("sp_cities")} className="sp-group">
              {CITIES.map((c) => (
                <CommandPrimitive.Item key={c} value={`city ${c}`} onSelect={() => go(() => navigate({ to: "/explore", search: { city: c } }))} className={item}>
                  <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />{c}
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.Group>
            <CommandPrimitive.Group heading={t("sp_pages")} className="sp-group">
              <CommandPrimitive.Item value={`page ${t("nav_offer")}`} onSelect={() => go(() => navigate({ to: "/offer" }))} className={item}>
                <PlusCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden />{t("nav_offer")}
              </CommandPrimitive.Item>
              <CommandPrimitive.Item value={`page ${t("nav_how")}`} onSelect={() => go(() => navigate({ to: "/how-it-works" }))} className={item}>
                <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden />{t("nav_how")}
              </CommandPrimitive.Item>
              <CommandPrimitive.Item value={`page ${t("nav_pros")}`} onSelect={() => go(() => navigate({ to: "/professionals" }))} className={item}>
                <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />{t("nav_pros")}
              </CommandPrimitive.Item>
            </CommandPrimitive.Group>
          </CommandPrimitive.List>
          <p className="hidden border-t px-4 py-2 text-xs text-muted-foreground pointer-fine:block">{t("sp_hint")}</p>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
