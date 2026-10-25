import { createFileRoute } from "@tanstack/react-router";
import { siteUrl } from "@/lib/seo";
import { robotsTxt } from "@/lib/sitemap";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) =>
        new Response(robotsTxt(siteUrl() ?? new URL(request.url).origin), {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
        }),
    },
  },
});
