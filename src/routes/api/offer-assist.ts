import { createFileRoute } from "@tanstack/react-router";

// Server-only: the handler and its Groq/Supabase wiring are loaded inside the server handler, never in the browser bundle.
export const Route = createFileRoute("/api/offer-assist")({
  server: {
    handlers: {
      // Not a page: anything but POST is refused (otherwise GET would fall through to page rendering).
      GET: () => new Response(null, { status: 405, headers: { allow: "POST" } }),
      POST: async ({ request }) => {
        const [{ handleOfferAssist }, { defaultDeps }] = await Promise.all([
          import("@/lib/server/ai/offer-assist-handler"),
          import("@/lib/server/ai/default-deps"),
        ]);
        return handleOfferAssist(request, defaultDeps());
      },
    },
  },
});
