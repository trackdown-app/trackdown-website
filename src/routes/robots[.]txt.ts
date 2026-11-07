import { createFileRoute } from "@tanstack/react-router";
import { robotsTxt } from "@/lib/sitemap";

// A route rather than a file in `public/`, so its sitemap address comes
// from `siteOrigin` (docs/seo.md#robotstxt).
export const Route = createFileRoute("/robots.txt")({
    server: {
        handlers: {
            GET: () =>
                new Response(robotsTxt(), {
                    headers: {
                        "Content-Type": "text/plain; charset=utf-8",
                        "Cache-Control": "public, max-age=3600",
                    },
                }),
        },
    },
});
