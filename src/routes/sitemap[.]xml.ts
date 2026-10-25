import { createFileRoute } from "@tanstack/react-router";
import { siteUrl } from "@/lib/seo";
import { publicPaths, sitemapXml } from "@/lib/sitemap";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = siteUrl() ?? new URL(request.url).origin;
        try {
          return new Response(sitemapXml(origin, await publicPaths()), {
            headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
          });
        } catch (e) {
          // Backend unavailable: a 503 tells crawlers to come back later (never an empty or partial sitemap).
          console.error(e);
          return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "retry-after": "600" } });
        }
      },
    },
  },
});
