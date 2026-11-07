import type { CaptureResult, PostHog, PostHogConfig } from "posthog-js";
import { CONSENT_TEXT_VERSION } from "@/lib/analytics/consent";
import type { ConsentChoice } from "@/lib/analytics/consent";

// Public ingestion key, intentionally included in the browser bundle. This is
// not a personal API key. Server telemetry keeps its own runtime configuration.
export const posthogProjectToken =
    "phc_vnP2gJ4ChTNrDsHKCCy4qEMTgPmFUwmFPRarWtK2khfX";
export const posthogApiHost = "https://t.trackdown.nl";

let loading: Promise<PostHog> | null = null;

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
        capture_pageleave: false,
        autocapture: false,
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
                        Object.entries(result.properties).map(([key, value]) => [
                            key,
                            sanitize(value),
                        ]),
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
