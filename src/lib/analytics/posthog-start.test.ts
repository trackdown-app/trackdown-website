// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

const init = vi.hoisted(() => vi.fn());
vi.mock("posthog-js", () => ({ default: { init } }));

beforeEach(() => {
    vi.resetModules();
    init.mockReset();
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
});
