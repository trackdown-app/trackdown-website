import type { CaptureResult, PostHog, PostHogConfig } from "posthog-js";
import { CONSENT_TEXT_VERSION } from "@/lib/analytics/consent";
import type { ConsentChoice } from "@/lib/analytics/consent";
import type {
    AnalyticsEventName,
    AnalyticsEventProperties,
} from "@/lib/analytics/events";

// Public ingestion key, intentionally included in the browser bundle. This is
// not a personal API key. Server telemetry keeps its own runtime configuration.
export const posthogProjectToken =
    "phc_vnP2gJ4ChTNrDsHKCCy4qEMTgPmFUwmFPRarWtK2khfX";
export const posthogApiHost = "https://t.trackdown.nl";

let loading: Promise<PostHog> | null = null;

/** Use the document's consent mode; analytics never blocks a game action. */
export function trackEvent<Name extends AnalyticsEventName>(
    name: Name,
    properties: AnalyticsEventProperties[Name],
): void {
    if (typeof window === "undefined" || loading == null) return;
    // Copy only the event contract's fields. Structural typing can otherwise
    // let a larger game object carry station data into capture at runtime.
    const safe = {
        network: properties.network,
        puzzle_number: properties.puzzle_number,
        archive: properties.archive,
        ...(name === "guess_made" && "guess_number" in properties
            ? { guess_number: properties.guess_number }
            : {}),
        ...((name === "puzzle_solved" || name === "puzzle_missed") &&
        "guesses_used" in properties
            ? { guesses_used: properties.guesses_used }
            : {}),
        ...(name === "result_shared" && "method" in properties
            ? { method: properties.method }
            : {}),
    };
    void loading
        .then((posthog) => posthog.capture(name, safe))
        .catch(() => undefined);
}

/** Remove only this project's persistence, preserving games and consent. */
export function clearPostHogStorage(): void {
    const prefix = `ph_${posthogProjectToken}_`;
    document.cookie = `${prefix}posthog=; Max-Age=0; Path=/; SameSite=Lax`;
    const names: ("localStorage" | "sessionStorage")[] = [
        "localStorage",
        "sessionStorage",
    ];
    for (const name of names) {
        try {
            const storage = window[name];
            const keys = Array.from({ length: storage.length }, (_, index) =>
                storage.key(index),
            );
            for (const key of keys) {
                if (key?.startsWith(prefix) === true) storage.removeItem(key);
            }
        } catch {
            // Browsers can deny either storage independently.
        }
    }
}

/** Strip URL queries and fragments, including URLs in nested SDK properties. */
function sanitize(value: unknown): unknown {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) {
        try {
            const url = new URL(value);
            url.search = "";
            url.hash = "";
            return url.toString();
        } catch {
            return value;
        }
    }
    if (Array.isArray(value)) return value.map(sanitize);
    if (typeof value === "object" && value != null) {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, sanitize(item)]),
        );
    }
    return value;
}

export function posthogOptions(
    consent: ConsentChoice | null,
): Partial<PostHogConfig> {
    const accepted = consent?.analytics === true;
    return {
        api_host: posthogApiHost,
        ui_host: "https://eu.posthog.com",
        defaults: "2026-08-30",
        // Native consent forms reload the document. Choose the mode before
        // init can read an old cookie or send the first pageview.
        ...(accepted ? {} : { cookieless_mode: "always" }),
        persistence: "cookie",
        disable_persistence: !accepted,
        cross_subdomain_cookie: false,
        person_profiles: "never",
        capture_pageview: "history_change",
        capture_pageleave: true,
        autocapture: true,
        capture_dead_clicks: false,
        capture_exceptions: false,
        capture_heatmaps: false,
        capture_performance: false,
        disable_session_recording: true,
        disable_surveys: true,
        disable_product_tours: true,
        disable_conversations: true,
        advanced_disable_flags: true,
        before_send: (result: CaptureResult | null) => {
            if (result == null) return null;
            return {
                ...result,
                properties: {
                    ...Object.fromEntries(
                        Object.entries(result.properties)
                            // Like SkoonHome, cookieless events omit DOM text,
                            // attributes and element chains before consent.
                            .filter(
                                ([key]) =>
                                    accepted ||
                                    ![
                                        "$elements",
                                        "$elements_chain",
                                        "$el_text",
                                    ].includes(key),
                            )
                            .map(([key, value]) => [key, sanitize(value)]),
                    ),
                    environment: import.meta.env.MODE,
                    consent_analytics: consent?.analytics ?? null,
                    consent_marketing: false,
                    consent_version: CONSENT_TEXT_VERSION,
                    $ip: null,
                },
            };
        },
    };
}

/** One SDK per document, loaded only after hydration, including in StrictMode. */
export function startPostHog(consent: ConsentChoice | null): Promise<PostHog> {
    if (loading != null) return loading;
    // Cleanup also runs when the SDK download is blocked or fails.
    if (consent?.analytics !== true) clearPostHogStorage();
    loading = import("posthog-js")
        .then(({ default: posthog }) => {
            posthog.init(posthogProjectToken, posthogOptions(consent));
            return posthog;
        })
        .catch((error: unknown) => {
            loading = null;
            throw error;
        });
    return loading;
}
