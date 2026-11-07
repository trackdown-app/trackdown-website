import { describe, expect, it, vi } from "vitest";
import {
    CONSENT_COOKIE_NAME,
    CONSENT_MAX_AGE_SECONDS,
    CONSENT_TEXT_VERSION,
    createConsentRecord,
    parseConsentCookie,
} from "@/lib/analytics/consent";
import { postConsent } from "@/lib/analytics/consent-post";

const now = new Date("2026-11-07T12:00:00.000Z");

function submit(
    answer: string,
    returnTo = "/en/archief/12?source=footer",
    headers: HeadersInit = { Origin: "https://trackdown.nl" },
): Promise<Response> {
    return postConsent(
        new Request("https://trackdown.nl/consent", {
            method: "POST",
            headers,
            body: new URLSearchParams({ answer, return: returnTo }),
        }),
    );
}

describe("consent record", () => {
    it.each([true, false])("round-trips analytics = %s", (analytics) => {
        const choice = { analytics };
        const record = createConsentRecord(choice, now);
        expect(record).toEqual({
            choice,
            version: CONSENT_TEXT_VERSION,
            givenAt: now.toISOString(),
        });
        expect(parseConsentCookie(JSON.stringify(record))).toEqual(choice);
    });

    it.each([
        null,
        undefined,
        "",
        "not json",
        "null",
        '{"analytics":true}',
        JSON.stringify({
            ...createConsentRecord({ analytics: true }, now),
            version: CONSENT_TEXT_VERSION - 1,
        }),
        JSON.stringify({
            ...createConsentRecord({ analytics: true }, now),
            givenAt: "yesterday",
        }),
        JSON.stringify({
            ...createConsentRecord({ analytics: true }, now),
            choice: { analytics: "true" },
        }),
    ])("asks again for an invalid or outdated cookie: %s", (cookie) => {
        expect(parseConsentCookie(cookie)).toBeNull();
    });
});

describe("POST /consent", () => {
    it.each(["accept", "decline"])(
        "stores %s and redirects back to the localized page",
        async (answer) => {
            vi.useFakeTimers();
            vi.setSystemTime(now);
            try {
                const response = await submit(answer);
                expect(response.status).toBe(303);
                expect(response.headers.get("Location")).toBe(
                    "/en/archief/12?source=footer#cookie-status",
                );
                expect(response.headers.get("Cache-Control")).toContain("no-store");
                const cookie = response.headers.get("Set-Cookie") ?? "";
                expect(cookie).toContain(`${CONSENT_COOKIE_NAME}=`);
                expect(cookie).toContain(`Max-Age=${CONSENT_MAX_AGE_SECONDS}`);
                expect(cookie).toContain("Path=/; ");
                expect(cookie).toContain("HttpOnly; SameSite=Lax");
                const value = cookie.split(";")[0]?.split("=")[1] ?? "";
                expect(JSON.parse(decodeURIComponent(value))).toEqual(
                    createConsentRecord({ analytics: answer === "accept" }, now),
                );
            } finally {
                vi.useRealTimers();
            }
        },
    );

    it("uses Secure cookies outside development", async () => {
        vi.stubEnv("DEV", false);
        expect((await submit("decline")).headers.get("Set-Cookie")).toContain(
            "; Secure",
        );
    });

    it("allows plain HTTP in development", async () => {
        vi.stubEnv("DEV", true);
        expect((await submit("decline")).headers.get("Set-Cookie")).not.toContain(
            "; Secure",
        );
    });

    it.each([
        {},
        { Origin: "https://elsewhere.test" },
        { "Sec-Fetch-Site": "cross-site", Origin: "https://trackdown.nl" },
        { "Sec-Fetch-Site": "same-site", Origin: "https://trackdown.nl" },
        { "Sec-Fetch-Site": "none" },
    ])("refuses cross-site or unverifiable submissions: %j", async (headers) => {
        const response = await submit("accept", "/", headers);
        expect(response.status).toBe(403);
        expect(response.headers.get("Set-Cookie")).toBeNull();
        expect(response.headers.get("Location")).toBeNull();
    });

    it("accepts the browser's same-origin fetch metadata", async () => {
        const response = await submit("decline", "/", {
            "Sec-Fetch-Site": "same-origin",
        });
        expect(response.status).toBe(303);
    });

    it.each(["", "yes", "all", "necessary"])(
        "refuses an unknown answer: %s",
        async (answer) => {
            const response = await submit(answer);
            expect(response.status).toBe(400);
            expect(response.headers.get("Set-Cookie")).toBeNull();
        },
    );

    it("refuses an unreadable body", async () => {
        const response = await postConsent(
            new Request("https://trackdown.nl/consent", {
                method: "POST",
                headers: { Origin: "https://trackdown.nl" },
                body: "not a form",
            }),
        );
        expect(response.status).toBe(400);
        expect(response.headers.get("Set-Cookie")).toBeNull();
    });

    it.each([
        "https://elsewhere.test",
        "//elsewhere.test/path",
        "/\\elsewhere.test/path",
        "/\n/elsewhere.test/path",
        "relative",
    ])("never redirects outside this site: %s", async (returnTo) => {
        const response = await submit("accept", returnTo);
        expect(response.headers.get("Location")).toBe("/#cookie-status");
    });

    it("removes the settings flag and old fragment after choosing again", async () => {
        const response = await submit(
            "decline",
            "/en/archief/12?source=footer&cookie-settings=open#cookie-title",
        );
        expect(response.headers.get("Location")).toBe(
            "/en/archief/12?source=footer#cookie-status",
        );
    });
});
