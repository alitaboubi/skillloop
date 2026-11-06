import { Suspense, lazy, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircleQuestion } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { OPEN_SUPPORT_EVENT, launcherHiddenOnPhone } from "@/lib/support";
import { notificationsQuery } from "@/lib/notifications-db";

const SupportPanel = lazy(() => import("@/components/support-panel").then((m) => ({ default: m.SupportPanel })));

/**
 * The round help button (bottom end of every page) and its panel, loaded on first open. Opens from anywhere via
 * openSupport() (account menu, footer, bell). A lime dot shows an unread team reply (from the bell's feed).
 */
export function SupportWidget() {
  const { t } = useI18n();
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"help" | "chat">("help");
  const feed = useQuery(notificationsQuery(user?.id ?? ""));
  const unread = !!feed.data?.items.some((n) => n.kind === "support_reply" && !n.read);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setTab((e as CustomEvent<"chat" | null>).detail === "chat" ? "chat" : "help");
      setLoaded(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_SUPPORT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, onOpen);
  }, []);

  const label = unread ? `${t("sup_open")} — ${t("sup_new_reply")}` : t("sup_open");
  return (
    <>
      <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={label} title={label}
        onClick={() => { setTab(unread ? "chat" : "help"); setLoaded(true); setOpen(true); }}
        className={`support-launcher fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] end-4 z-30 grid size-14 place-items-center rounded-full bg-ink text-lime shadow-lg ring-1 ring-ink-foreground/10 transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sea motion-reduce:transition-none motion-reduce:hover:scale-100 md:bottom-6 md:end-6 ${open ? "invisible" : ""} ${launcherHiddenOnPhone(pathname) ? "max-md:hidden" : ""}`}>
        <MessageCircleQuestion className="size-6" aria-hidden />
        {unread && <span aria-hidden className="absolute end-0.5 top-0.5 size-3.5 rounded-full bg-lime ring-2 ring-ink" />}
      </button>
      {loaded && (
        <Suspense fallback={null}>
          <SupportPanel open={open} onOpenChange={setOpen} tab={tab} onTab={setTab} />
        </Suspense>
      )}
    </>
  );
}
