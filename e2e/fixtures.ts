import { test as base, expect } from "@playwright/test";
import type { Page, Response } from "@playwright/test";
import { posthogApiHost } from "@/lib/analytics/posthog-hosts";
import { clockShiftMs } from "./clock.ts";

/**
 * The browser checks' `test`: every page as a first visit sees it, with the
 * cookie banner up and nothing kept on the device. The browser's clock moves
 * by the same days as the server's (e2e/clock.ts), so the page and its
 * countdown agree with the server on today's puzzle. PostHog's proxy is
 * blocked, so a check never counts as a visit.
 */
export const test = base.extend({
    // Playwright's `use`, named otherwise so it is not taken for a React hook.
    page: async ({ page }, provide) => {
        await page.route(`${posthogApiHost}/**`, (route) => route.abort());
        const realNow = Date.now();
        await page.clock.install({ time: realNow + clockShiftMs(realNow) });
        await provide(page);
    },
});

export { expect };

/**
 * Opens `path` and waits until the page has loaded its scripts and hydrated,
 * so keys and clicks reach React. The response, for its status.
 */
export async function openPage(page: Page, path: string): Promise<Response | null> {
    const response = await page.goto(path, { waitUntil: "networkidle" });
    // The cookie banner, which a first visit always shows.
    await expect(page.getByRole("region", { name: /^Cookies,/ })).toBeVisible();
    return response;
}
