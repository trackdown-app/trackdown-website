import { createServerFn } from "@tanstack/react-start";
import { getCookie, setResponseHeader } from "@tanstack/react-start/server";
import { CONSENT_COOKIE_NAME, parseConsentCookie } from "@/lib/analytics/consent";
import type { ConsentChoice } from "@/lib/analytics/consent";

/** Read on the server; the root loader hands the answer to the first render. */
export const getConsentFn = createServerFn({ method: "GET" }).handler(
    (): ConsentChoice | null => {
        setResponseHeader("Cache-Control", "private, no-store");
        return parseConsentCookie(getCookie(CONSENT_COOKIE_NAME));
    },
);
