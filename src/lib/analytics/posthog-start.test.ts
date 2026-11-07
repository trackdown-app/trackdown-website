// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

const { init, capture } = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { init, capture } }));

beforeEach(() => {
    vi.resetModules();
    init.mockReset();
    capture.mockReset();
    localStorage.clear();
});

describe("PostHog document startup", () => {
    it("does not initialize during import and initializes once for repeated effects", async () => {
        const { startPostHog, posthogProjectToken } =
            await import("@/lib/analytics/posthog-client");
        expect(init).not.toHaveBeenCalled();
        const first = startPostHog(null);
        expect(startPostHog(null)).toBe(first);
        await first;
        expect(init).toHaveBeenCalledExactlyOnceWith(
            posthogProjectToken,
            expect.objectContaining({ cookieless_mode: "always" }),
        );
    });

    it("cleans up before loading, including when startup fails, and allows a retry", async () => {
        const { startPostHog, posthogProjectToken } =
            await import("@/lib/analytics/posthog-client");
        localStorage.setItem(`ph_${posthogProjectToken}_posthog`, "old");
        init.mockImplementationOnce(() => {
            throw new Error("SDK blocked");
        });

        const starting = startPostHog({ analytics: false });
        expect(localStorage.length).toBe(0);
        await expect(starting).rejects.toThrow("SDK blocked");
        await startPostHog({ analytics: false });
        expect(init).toHaveBeenCalledTimes(2);
    });

    it("does not start the SDK or choose consent when a game event is sent before startup", async () => {
        const { trackEvent } = await import("@/lib/analytics/posthog-client");
        trackEvent("puzzle_started", {
            network: "nl",
            puzzle_number: 142,
            archive: false,
        });
        await Promise.resolve();
        expect(init).not.toHaveBeenCalled();
        expect(capture).not.toHaveBeenCalled();
    });

    it("waits for startup and strips extra station data from game properties", async () => {
        const { startPostHog, trackEvent } =
            await import("@/lib/analytics/posthog-client");
        const starting = startPostHog(null);
        const properties = {
            network: "nl" as const,
            puzzle_number: 142,
            archive: false,
            guess_number: 2,
            guess: "ut",
            station: "zl",
            name: "Utrecht Centraal",
            steps: [{ kind: "change", station: "asd" }],
            text: "Private search or share text",
        };
        trackEvent("guess_made", properties);
        await starting;
        await Promise.resolve();
        expect(capture).toHaveBeenCalledExactlyOnceWith("guess_made", {
            network: "nl",
            puzzle_number: 142,
            archive: false,
            guess_number: 2,
        });
    });

    it("swallows initialization and capture failures without interrupting play", async () => {
        const { startPostHog, trackEvent } =
            await import("@/lib/analytics/posthog-client");
        init.mockImplementationOnce(() => {
            throw new Error("SDK blocked");
        });
        const starting = startPostHog(null);
        const properties = {
            network: "nl" as const,
            puzzle_number: 142,
            archive: false,
        };
        expect(() => trackEvent("puzzle_started", properties)).not.toThrow();
        await expect(starting).rejects.toThrow("SDK blocked");
        await startPostHog(null);
        capture.mockImplementationOnce(() => {
            throw new Error("Capture blocked");
        });
        expect(() => trackEvent("puzzle_started", properties)).not.toThrow();
        await Promise.resolve();
        await Promise.resolve();
        expect(capture).toHaveBeenCalledTimes(1);
    });
});
