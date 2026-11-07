/**
 * The managed reverse proxy in front of PostHog's EU cloud
 * (docs/analytics.md#posthog-project-and-proxy). posthog-js sends events to
 * it and loads its remote configuration from it. Kept free of imports, so
 * `src/lib/security-headers.ts`, which `vite.config.ts` loads outside the
 * `@/` alias, can name it in the Content-Security-Policy.
 */
export const posthogApiHost = "https://t.trackdown.nl";
