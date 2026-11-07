import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { puzzlesFileSchema, stationsFileSchema } from "@/lib/data/data-schema";
import type { Station } from "@/lib/data/data-schema";

/** The Dutch network of the fixture the build is made from (e2e/clock.ts). */
const fixtureDir = join(
    import.meta.dirname,
    "..",
    "fixtures",
    "trackdown-data",
    "nl",
);

function readFixture(file: string): unknown {
    const value: unknown = JSON.parse(readFileSync(join(fixtureDir, file), "utf8"));
    return value;
}

const stations = stationsFileSchema.parse(readFixture("stations.json"));
const puzzles = puzzlesFileSchema.parse(readFixture("puzzles.json"));

/**
 * The mystery station of the puzzle the game page shows, found from the
 * puzzle number in its title ("Trackdown NL · Puzzle 3"), and a station that
 * is not it, for a wrong guess.
 */
export async function todayStations(
    page: Page,
): Promise<{ answer: Station; wrong: Station }> {
    const number = Number(/(\d+)$/.exec(await page.title())?.[1]);
    const code = puzzles.find((puzzle) => puzzle.n === number)?.station;
    const answer = stations.find((station) => station.code === code);
    const wrong = stations.find((station) => station.code !== code);
    if (answer == null || wrong == null) {
        throw new Error(`the fixture has no puzzle ${number}`);
    }
    return { answer, wrong };
}

/**
 * Guesses `station` with the keyboard alone, from the station search that has
 * focus: types the start of its name, Enter picks the first match, Enter
 * again guesses it. Done once the server has answered and the guess is in
 * the guess list.
 */
export async function guessByKeyboard(page: Page, station: Station): Promise<void> {
    const search = page.getByRole("combobox");
    await expect(search).toBeFocused();
    await page.keyboard.type(station.name.slice(0, 4));
    await expect(page.getByRole("option").first()).toContainText(station.name);
    await page.keyboard.press("Enter");
    await expect(search).toHaveValue(station.name);
    await page.keyboard.press("Enter");
    await expect(
        page.getByRole("listitem").filter({ hasText: station.name }).first(),
    ).toBeAttached();
}
