import type { Locator } from "@playwright/test";
import { expect, openPage, test } from "./fixtures";
import { guessByKeyboard, todayStations } from "./play";

/** The outline an element shows while it has keyboard focus. */
async function focusOutline(element: Locator) {
    return element.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
            focusVisible: node.matches(":focus-visible"),
            style: style.outlineStyle,
            width: Number.parseFloat(style.outlineWidth),
        };
    });
}

// Every page opens as on a first visit, with the cookie banner up, so the
// banner must not take the first Tab or trap focus.
test.describe("the keyboard", () => {
    test("plays today's puzzle to the end without a mouse", async ({ page }) => {
        await openPage(page, "/en/nl");
        const { answer, wrong } = await todayStations(page);

        await page.keyboard.press("Tab");
        const skipLink = page.getByRole("link", { name: "Skip to content" });
        await expect(skipLink).toBeFocused();
        await expect(skipLink).toBeInViewport();
        expect(await focusOutline(skipLink)).toMatchObject({
            focusVisible: true,
            style: "solid",
        });

        // Past the header, the search is the first stop in the page.
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/#content$/);
        await page.keyboard.press("Tab");
        const search = page.getByRole("combobox", { name: "Guess a station" });
        await expect(search).toBeFocused();

        await guessByKeyboard(page, wrong);
        await expect(
            page.getByRole("list", { name: "Your guesses" }).getByRole("listitem"),
        ).toHaveCount(1);
        await expect(search).toBeFocused();

        // The guess that wins removes the search, so focus moves to the
        // answer, read out as the page's heading.
        await guessByKeyboard(page, answer);
        await expect(
            page.getByRole("heading", { level: 1, name: answer.name }),
        ).toBeFocused();
    });

    test("names the skip link in Dutch on a Dutch page", async ({ page }) => {
        await openPage(page, "/nl");
        await page.keyboard.press("Tab");
        await expect(
            page.getByRole("link", { name: "Naar de inhoud" }),
        ).toBeFocused();
    });
});
