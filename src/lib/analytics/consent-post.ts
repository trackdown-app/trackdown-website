import {
    CONSENT_COOKIE_NAME,
    CONSENT_MAX_AGE_SECONDS,
    consentSettingsParameter,
    createConsentRecord,
} from "@/lib/analytics/consent";

/** Only a local path can be the destination of a consent form. */
function returnPath(value: FormDataEntryValue | null, origin: string): string {
    if (
        typeof value !== "string" ||
        !value.startsWith("/") ||
        value.startsWith("//") ||
        /[\\\r\n\t]/.test(value)
    ) {
        return "/";
    }
    const url = new URL(value, origin);
    if (url.origin !== origin) return "/";
    url.searchParams.delete(consentSettingsParameter);
    return `${url.pathname}${url.search}`;
}

/** Native form submission works before hydration and with JavaScript disabled. */
export async function postConsent(request: Request): Promise<Response> {
    const origin = new URL(request.url).origin;
    const fetchSite = request.headers.get("Sec-Fetch-Site");
    const sameOrigin =
        fetchSite != null
            ? fetchSite === "same-origin"
            : request.headers.get("Origin") === origin;
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    if (!sameOrigin) return new Response(null, { status: 403, headers });

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return new Response(null, { status: 400, headers });
    }
    const answer = form.get("answer");
    if (answer !== "accept" && answer !== "decline") {
        return new Response(null, { status: 400, headers });
    }
    const record = createConsentRecord(
        { analytics: answer === "accept" },
        new Date(),
    );
    headers.set(
        "Set-Cookie",
        `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(record))}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${import.meta.env.DEV ? "" : "; Secure"}`,
    );
    headers.set(
        "Location",
        `${returnPath(form.get("return"), origin)}#cookie-status`,
    );
    return new Response(null, { status: 303, headers });
}
