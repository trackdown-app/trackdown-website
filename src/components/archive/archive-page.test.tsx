// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    RouterProvider,
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
} from "@tanstack/react-router";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import {
    deLocalizeUrl,
    localizeHref,
    localizeUrl,
    overwriteGetLocale,
} from "@/paraglide/runtime";
import { ArchivePage } from "@/components/archive/archive-page";
import { gameStorageKey, serializeGame } from "@/lib/game/game-state";
import { createGameStore } from "@/lib/game/game-store";
import type { ArchivedPuzzle } from "@/lib/game/schemas";
import type { ListedGuess } from "@/lib/game/trip-line";
import { renderAt } from "@/test/render-at";

const puzzles: ArchivedPuzzle[] = [
    { number: 1, date: "2026-11-03" },
    { number: 2, date: "2026-11-04" },
    { number: 3, date: "2026-11-05" },
    { number: 4, date: "2026-11-06" },
];
const today = "2026-11-06";

function miss(code: string): ListedGuess {
    return {
        guess: code,
        correct: false,
        steps: [{ kind: "ride", train: "IC", minutes: 17 }],
        totalMinutes: 17,
    };
}
const hit: ListedGuess = { guess: "zl", correct: true, steps: [], totalMinutes: 0 };

/** The archive in the browser, inside a router as on the site. */
async function renderArchive(list: readonly ArchivedPuzzle[] = puzzles) {
    const store = createGameStore(() => window.localStorage);
    const rootRoute = createRootRoute({
        component: () => (
            <ArchivePage network="nl" puzzles={list} today={today} store={store} />
        ),
    });
    const pageRoute = createRoute({ getParentRoute: () => rootRoute, path: "$" });
    const router = createRouter({
        routeTree: rootRoute.addChildren([pageRoute]),
        history: createMemoryHistory({ initialEntries: [localizeHref("/archief")] }),
        rewrite: {
            input: ({ url }) => deLocalizeUrl(url),
            output: ({ url }) => localizeUrl(url),
        },
    });
    await router.load();
    await act(async () => {
        render(<RouterProvider router={router} />);
        await Promise.resolve();
    });
    return store;
}

function rows(): HTMLElement[] {
    return within(screen.getByRole("list", { name: "Puzzles" })).getAllByRole(
        "link",
    );
}

beforeEach(() => {
    window.localStorage.clear();
    overwriteGetLocale(() => "en");
});

afterEach(() => {
    cleanup();
});

describe("ArchivePage", () => {
    it("lists every puzzle newest first, each linking to its game", async () => {
        await renderArchive();

        expect(
            screen.getByRole("heading", { level: 1, name: "Archive" }),
        ).toBeDefined();
        expect(rows().map((row) => row.getAttribute("href"))).toEqual([
            // Today's is played on the home page.
            "/en",
            "/en/archief/3",
            "/en/archief/2",
            "/en/archief/1",
        ]);
        expect(rows()[0]?.textContent).toContain("Puzzle 4Today");
        expect(rows()[1]?.textContent).toContain("Thursday 5 November");
    });

    it("shows the result kept on this device for each puzzle", async () => {
        window.localStorage.setItem(
            gameStorageKey("nl", 1),
            serializeGame([miss("ut"), hit]),
        );
        window.localStorage.setItem(
            gameStorageKey("nl", 2),
            serializeGame(
                Array.from({ length: 6 }, (_, index) => miss(`s${index}`)),
            ),
        );
        window.localStorage.setItem(
            gameStorageKey("nl", 3),
            serializeGame([miss("ut")]),
        );
        await renderArchive();

        expect(rows().map((row) => row.lastElementChild?.textContent)).toEqual([
            "Not played yet",
            "Guess 2 of 6",
            "Missed",
            "Found in 2 of 6",
        ]);
    });

    it("updates a result when a game is played in another tab", async () => {
        const store = await renderArchive();

        act(() => {
            store.write(gameStorageKey("nl", 3), serializeGame([hit], true));
        });

        expect(rows()[1]?.lastElementChild?.textContent).toBe("Found in 1 of 6");
    });

    it("says so when there are no puzzles yet", async () => {
        await renderArchive([]);

        expect(screen.queryByRole("list")).toBeNull();
        expect(screen.getByText("There are no puzzles yet.")).toBeDefined();
    });

    it("renders on the server as not played, in Dutch", async () => {
        overwriteGetLocale(() => "nl");
        window.localStorage.setItem(gameStorageKey("nl", 3), serializeGame([hit]));
        const html = await renderAt(
            () => <ArchivePage network="nl" puzzles={puzzles} today={today} />,
            "/archief",
        );

        expect(html).toContain("Archief");
        expect(html).toContain("tellen niet mee voor je reeks");
        expect(html).toContain('href="/archief/3"');
        expect(html).toContain("Donderdag 5 november");
        expect(html).not.toContain("Gevonden");
        expect(html.match(/Nog niet gespeeld/g)).toHaveLength(4);
    });
});
