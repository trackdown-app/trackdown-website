import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, openPage, test } from "./fixtures";
import { checkedPages, localizedPath, notFoundPath } from "./pages";
import { guessByKeyboard, todayStations } from "./play";

/** The WCAG 2.2 A and AA rules axe knows. */
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Every axe violation on the page as it is now, of any impact. */
async function axeViolations(page: Page) {
    const { violations } = await new AxeBuilder({ page })
        .withTags(wcagTags)
        .analyze();
    return violations.map(({ id, impact, help, nodes }) => ({
        rule: `${id} (${impact ?? "unknown"}): ${help}`,
        nodes: nodes.map((node) => node.target.join(" ")),
    }));
}

const locales = ["nl", "en"] as const;

// The theme follows the system's, so axe checks the colours of both.
for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`in the ${colorScheme} theme`, () => {
        test.use({ colorScheme });

        for (const locale of locales) {
            for (const { name, path } of checkedPages) {
                const url = localizedPath(path, locale);
                // The cookie banner is up, so axe checks it on every page too.
                test(`${name} (${url}) has no axe violations`, async ({ page }) => {
                    const response = await openPage(page, url);
                    expect(response?.status()).toBe(200);
                    expect(await axeViolations(page)).toEqual([]);
                });
            }

            const missing = localizedPath(notFoundPath, locale);
            test(`the not-found page (${missing}) has no axe violations`, async ({
                page,
            }) => {
                const response = await openPage(page, missing);
                expect(response?.status()).toBe(404);
                expect(await axeViolations(page)).toEqual([]);
            });

            const game = localizedPath("/nl", locale);
            test(`the solved game (${game}) has no axe violations`, async ({
                page,
            }) => {
                await openPage(page, game);
                const { answer, wrong } = await todayStations(page);
                await page.getByRole("combobox").focus();
                await guessByKeyboard(page, wrong);
                await guessByKeyboard(page, answer);
                await expect(
                    page.getByRole("heading", { level: 1, name: answer.name }),
                ).toBeVisible();
                expect(await axeViolations(page)).toEqual([]);
            });
        }
    });
}
