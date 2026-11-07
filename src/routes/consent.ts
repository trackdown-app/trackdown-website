import { createFileRoute } from "@tanstack/react-router";
import { postConsent } from "@/lib/analytics/consent-post";

export const Route = createFileRoute("/consent")({
    server: { handlers: { POST: ({ request }) => postConsent(request) } },
});
