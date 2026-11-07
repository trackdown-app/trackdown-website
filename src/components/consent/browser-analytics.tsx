import { useEffect } from "react";
import type { ConsentChoice } from "@/lib/analytics/consent";
import { startPostHog } from "@/lib/analytics/posthog-client";

export function BrowserAnalytics({ consent }: { consent: ConsentChoice | null }) {
    useEffect(() => {
        // Analytics failures must never interrupt the game.
        void startPostHog(consent).catch(() => undefined);
    }, [consent]);
    return null;
}
