import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AuthProvider, ReturnAfterOAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { SiteHeader, SiteFooter, BottomNav } from "@/components/site";
import { PointerField } from "@/components/brand";

const GOOGLE_SITE_VERIFICATION = (import.meta.env["VITE_GOOGLE_SITE_VERIFICATION"] as string | undefined)?.trim() ?? "";
import { ErrorScreen } from "@/components/error-screen";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

function NotFoundComponent() {
  const { t } = useI18n();
  return (
    <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden px-4 py-16">
      <PointerField tone="light" />
      <div className="relative max-w-md text-center">
        <p className="display-title text-7xl tabular-nums text-foreground">404</p>
        <h1 className="mt-4 text-xl font-semibold text-foreground">{t("nf_title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("nf_desc")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/" className="btn btn-ink">{t("nf_home")}</Link>
          <Link to="/explore" className="btn btn-outline">{t("explore_services")}</Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SkillLoop — Talents locaux en Tunisie" },
      { name: "description", content: "Trouvez ou proposez des services locaux en Tunisie." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      // Google Search Console ownership (URL-prefix property on the workers.dev URL; the token is public by design).
      ...(GOOGLE_SITE_VERIFICATION ? [{ name: "google-site-verification", content: GOOGLE_SITE_VERIFICATION }] : []),
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg?v=2", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorScreen,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
        <ReturnAfterOAuth />
        <div className="app-shell flex min-h-dvh flex-col overflow-x-clip">
          <SiteHeader />
          <main className="flex-1">
            <Outlet />
          </main>
          <SiteFooter />
          <BottomNav />
          {/* Top-center under the sticky header: never over the bottom nav, the service request bar or the support button. */}
          <Toaster position="top-center" offset={{ top: "5rem" }} mobileOffset={{ top: "calc(env(safe-area-inset-top, 0px) + 4.75rem)" }} />
        </div>
      </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
