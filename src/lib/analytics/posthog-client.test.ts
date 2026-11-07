// @vitest-environment happy-dom
import { PostHog } from "posthog-js";
import type { CaptureResult } from "posthog-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    clearPostHogStorage,
    posthogOptions,
    posthogProjectToken,
} from "@/lib/analytics/posthog-client";
import { CONSENT_TEXT_VERSION } from "@/lib/analytics/consent";
import type { ConsentChoice } from "@/lib/analytics/consent";

const instances: PostHog[] = [];
const cookieName = `ph_${posthogProjectToken}_posthog`;
const originalPushState = window.history.pushState.bind(window.history);
const originalReplaceState = window.history.replaceState.bind(window.history);
const request = vi.hoisted(() => {
    const mock = vi.fn(() => Promise.resolve(new Response("{}", { status: 200 })));
    // The SDK captures fetch when imported, before ordinary test setup runs.
    vi.stubGlobal("fetch", mock);
    return mock;
});

function start(consent: ConsentChoice | null) {
    if (consent?.analytics !== true) clearPostHogStorage();
    const posthog = new PostHog();
    const events: CaptureResult[] = [];
    posthog.on("eventCaptured", (event: CaptureResult) => events.push(event));
    instances.push(posthog);
    posthog.init(posthogProjectToken, {
        ...posthogOptions(consent),
        request_batching: false,
        disable_external_dependency_loading: true,
        // Happy DOM is correctly classified as a bot by the SDK.
        opt_out_useragent_filter: true,
    });
    return { posthog, events };
}

beforeEach(() => {
    request.mockClear();
    vi.useFakeTimers();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
    window.history.replaceState({}, "", "/");
});

afterEach(async () => {
    for (const posthog of instances.splice(0)) {
        posthog.set_config({ capture_pageview: false, disable_persistence: true });
        await posthog.shutdown();
    }
    vi.restoreAllMocks();
    // SDK history wrappers survive shutdown. Each test represents a new document.
    window.history.pushState = originalPushState;
    window.history.replaceState = originalReplaceState;
    document.cookie = `${cookieName}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`;
    document.cookie =
        "trackdown-consent=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/";
    localStorage.clear();
    sessionStorage.clear();
    document.body.replaceChildren();
    vi.useRealTimers();
});

describe("PostHog browser analytics with the real SDK", () => {
    it.each([null, { analytics: false }, { analytics: true }])(
        "applies consent and privacy properties to explicit game events for %s",
        async (consent) => {
            const { posthog, events } = start(consent);
            const properties = { network: "nl", puzzle_number: 142, archive: true };
            posthog.capture("puzzle_started", properties);
            posthog.capture("archive_puzzle_played", properties);
            posthog.capture("guess_made", { ...properties, guess_number: 2 });
            posthog.capture("puzzle_solved", { ...properties, guesses_used: 2 });
            posthog.capture("puzzle_missed", { ...properties, guesses_used: 6 });
            posthog.capture("result_shared", { ...properties, method: "copied" });
            await vi.advanceTimersByTimeAsync(300);

            const gameEvents = events.filter(
                (event) => !event.event.startsWith("$"),
            );
            expect(gameEvents).toHaveLength(6);
            for (const event of gameEvents) {
                expect(event.properties).toMatchObject({
                    ...properties,
                    consent_analytics: consent?.analytics ?? null,
                    consent_marketing: false,
                    consent_version: CONSENT_TEXT_VERSION,
                    $ip: null,
                });
            }
            if (consent?.analytics !== true) {
                expect(document.cookie).toBe("");
                expect(localStorage.length).toBe(0);
                expect(sessionStorage.length).toBe(0);
            }
        },
    );

    it.each([null, { analytics: false }, { analytics: true }])(
        "automatically captures clicks, form changes, submissions and pageleave for %s",
        async (consent) => {
            const { events } = start(consent);
            await vi.advanceTimersByTimeAsync(300);

            const button = document.createElement("button");
            button.textContent = "Open statistics";
            const form = document.createElement("form");
            const input = document.createElement("input");
            input.value = "Private typed value";
            form.append(input);
            document.body.append(button, form);

            button.click();
            input.dispatchEvent(new Event("change", { bubbles: true }));
            form.dispatchEvent(new Event("submit", { bubbles: true }));
            window.dispatchEvent(new Event("pagehide"));
            await vi.advanceTimersByTimeAsync(300);

            const interactions = events.filter(
                (event) => event.event === "$autocapture",
            );
            expect(
                interactions.map((event) => event.properties["$event_type"]),
            ).toEqual(["click", "change", "submit"]);
            expect(events.some((event) => event.event === "$pageleave")).toBe(true);
            for (const event of interactions) {
                expect(event.properties).toMatchObject({
                    consent_analytics: consent?.analytics ?? null,
                    consent_marketing: false,
                    consent_version: CONSENT_TEXT_VERSION,
                });
                expect(JSON.stringify(event)).not.toContain("Private typed value");
            }
            if (consent?.analytics !== true) {
                expect(JSON.stringify(interactions)).not.toContain(
                    "Open statistics",
                );
                expect(document.cookie).toBe("");
                expect(localStorage.length).toBe(0);
                expect(sessionStorage.length).toBe(0);
            } else {
                expect(JSON.stringify(interactions)).toContain("Open statistics");
            }
        },
    );

    it.each([null, { analytics: false }])(
        "captures the initial and client navigation pageviews without persistence for %s",
        async (consent) => {
            const { events } = start(consent);
            await vi.advanceTimersByTimeAsync(300);

            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({
                event: "$pageview",
                properties: {
                    distinct_id: "$posthog_cookieless",
                    consent_analytics: consent?.analytics ?? null,
                    consent_marketing: false,
                    consent_version: CONSENT_TEXT_VERSION,
                    $ip: null,
                },
            });
            expect(document.cookie).toBe("");
            expect(localStorage.length).toBe(0);
            expect(sessionStorage.length).toBe(0);

            const path = consent == null ? "/en/archief" : "/hoe-te-spelen";
            window.history.pushState({}, "", `${path}?private=secret#private`);
            await vi.advanceTimersByTimeAsync(300);
            expect(events).toHaveLength(2);
            expect(events[1]?.properties["$current_url"]).toBe(
                `${window.location.origin}${path}`,
            );
            expect(document.cookie).toBe("");
            expect(localStorage.length).toBe(0);
            expect(sessionStorage.length).toBe(0);
            expect(request).toHaveBeenCalledWith(
                expect.stringMatching(/^https:\/\/t\.trackdown\.nl\//),
                expect.anything(),
            );
        },
    );

    it("sets a host-only cookie after acceptance and keeps its identity on reload", async () => {
        const { posthog, events } = start({ analytics: true });
        await vi.advanceTimersByTimeAsync(300);
        const identity = posthog.get_distinct_id();

        expect(document.cookie).toContain(`${cookieName}=`);
        expect(identity).not.toBe("$posthog_cookieless");
        expect(events[0]?.properties).toMatchObject({
            consent_analytics: true,
            consent_marketing: false,
            $process_person_profile: false,
        });
        expect(posthog.config.cross_subdomain_cookie).toBe(false);
        expect(posthog.config.persistence).toBe("cookie");

        const reloaded = start({ analytics: true });
        await vi.advanceTimersByTimeAsync(300);
        expect(reloaded.posthog.get_distinct_id()).toBe(identity);
    });

    it.each([null, { analytics: false }])(
        "removes old accepted persistence before a document starts with %s",
        async (consent) => {
            start({ analytics: true });
            await vi.advanceTimersByTimeAsync(300);
            expect(document.cookie).toContain(`${cookieName}=`);
            localStorage.setItem(`ph_${posthogProjectToken}_posthog`, "{}");
            sessionStorage.setItem(`ph_${posthogProjectToken}_window_id`, "old");
            localStorage.setItem("trackdown-game", "saved-game");
            document.cookie = "trackdown-consent=saved-choice; Path=/";

            const { events } = start(consent);
            await vi.advanceTimersByTimeAsync(300);

            expect(document.cookie).not.toContain(`${cookieName}=`);
            expect(document.cookie).toContain("trackdown-consent=saved-choice");
            expect(localStorage.getItem("trackdown-game")).toBe("saved-game");
            expect(
                localStorage.getItem(`ph_${posthogProjectToken}_posthog`),
            ).toBeNull();
            expect(
                sessionStorage.getItem(`ph_${posthogProjectToken}_window_id`),
            ).toBeNull();
            expect(events[0]?.properties["distinct_id"]).toBe("$posthog_cookieless");
        },
    );

    it("cleans session storage even when local storage is unavailable", () => {
        sessionStorage.setItem(`ph_${posthogProjectToken}_window_id`, "old");
        vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
            throw new Error("Storage denied");
        });
        expect(clearPostHogStorage).not.toThrow();
        expect(sessionStorage.length).toBe(0);
    });

    it("strips nested URL queries and fragments and overrides consent and IP properties", () => {
        const beforeSend = posthogOptions(null).before_send;
        if (typeof beforeSend !== "function") throw new Error("Missing before_send");
        const event = beforeSend({
            uuid: "test-event",
            event: "$pageview",
            properties: {
                $current_url: "https://trackdown.nl/?secret=value#secret",
                nested: [
                    { referrer: "https://example.com/path?secret=value#secret" },
                ],
                consent_analytics: true,
                $ip: "203.0.113.1",
            },
        });
        expect(event?.properties).toMatchObject({
            $current_url: "https://trackdown.nl/",
            nested: [{ referrer: "https://example.com/path" }],
            consent_analytics: null,
            $ip: null,
        });
    });
});
