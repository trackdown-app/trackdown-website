// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { GamePage } from "@/components/game/game-page";
import { gameStorageKey, serializeGame } from "@/lib/game/game-state";
import { createGameStore } from "@/lib/game/game-store";
import type { GameStore } from "@/lib/game/game-store";
import type { GuessInput, GuessOutput } from "@/lib/game/schemas";
import type { ListedGuess } from "@/lib/game/trip-line";

const { submitGuessFn } = vi.hoisted(() => ({
    submitGuessFn: vi.fn<(options: { data: GuessInput }) => Promise<GuessOutput>>(),
}));
vi.mock("@/lib/game/guess.functions", () => ({ submitGuessFn }));

const puzzle = {
    network: "nl" as const,
    number: 142,
    date: "2026-11-06",
    maxGuesses: 6,
    nextPuzzleAt: "2026-11-06T23:00:00.000Z",
};
const key = gameStorageKey("nl", 142);

const stations = [
    { code: "asd", name: "Amsterdam Centraal", province: "Noord-Holland" },
    { code: "ut", name: "Utrecht Centraal", province: "Utrecht" },
    { code: "hvs", name: "Hilversum", province: "Noord-Holland" },
    { code: "mt", name: "Maastricht", province: "Limburg" },
    { code: "hdr", name: "Den Helder", province: "Noord-Holland" },
    { code: "gn", name: "Groningen", province: "Groningen" },
    { code: "zl", name: "Zwolle", province: "Overijssel" },
];

function miss(code: string, minutes = 17): ListedGuess {
    return {
        guess: code,
        correct: false,
        steps: [{ kind: "ride", train: "IC", minutes }],
        totalMinutes: minutes,
    };
}

function answer(
    input: GuessInput,
    correct: boolean,
    earlierTrips: GuessOutput["earlierTrips"] = [],
): GuessOutput {
    return {
        network: input.network,
        number: input.number,
        earlierTrips,
        ...(correct
            ? { guess: input.guess, correct, steps: [], totalMinutes: 0 }
            : miss(input.guess)),
    };
}

function renderGame(store: GameStore) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <GamePage puzzle={puzzle} stations={stations} store={store} />
        </QueryClientProvider>,
    );
    return userEvent.setup();
}

async function guess(user: ReturnType<typeof userEvent.setup>, name: string) {
    await user.type(screen.getByRole("combobox"), name);
    // The open list hides the rest of the page from the accessibility tree,
    // so the button is found by its text (station-search.test.tsx).
    await user.click(screen.getByText("Guess", { selector: "button" }));
}

function guessedNames(): string[] {
    return screen
        .queryAllByRole("listitem")
        .map((row) => row.querySelector(".font-condensed")?.textContent ?? "");
}

beforeEach(() => {
    window.localStorage.clear();
    overwriteGetLocale(() => "en");
});

afterEach(() => {
    cleanup();
});

describe("GamePage", () => {
    it("names the puzzle's day and number", () => {
        renderGame(createGameStore(() => window.localStorage));

        expect(screen.getByText("Friday 6 November, puzzle 142")).toBeDefined();
        expect(
            screen.getByRole("heading", {
                name: "Which station is today's mystery?",
            }),
        ).toBeDefined();
    });

    it("shows the kept guesses, newest first, with the progress", () => {
        window.localStorage.setItem(key, serializeGame([miss("hvs"), miss("ut")]));
        renderGame(createGameStore(() => window.localStorage));

        expect(guessedNames()).toEqual(["Utrecht Centraal", "Hilversum"]);
        expect(screen.getByText("Guess 3 of 6, newest first")).toBeDefined();
        expect(screen.getByRole("combobox").getAttribute("placeholder")).toBe(
            "Guess station 3 of 6",
        );
    });

    it("sends a guess with the earlier ones and keeps its answer over a reload", async () => {
        window.localStorage.setItem(key, serializeGame([miss("hvs")]));
        submitGuessFn.mockImplementation(({ data }) =>
            Promise.resolve(answer(data, false)),
        );
        const user = renderGame(createGameStore(() => window.localStorage));

        await guess(user, "Utrecht Centraal");

        await waitFor(() => {
            expect(guessedNames()).toEqual(["Utrecht Centraal", "Hilversum"]);
        });
        // The new guess arrives; the kept one stays still.
        expect(
            screen
                .getAllByRole("listitem")
                .map((row) => row.classList.contains("guess-enter")),
        ).toEqual([true, false]);
        expect(submitGuessFn).toHaveBeenCalledWith({
            data: {
                network: "nl",
                number: 142,
                guess: "ut",
                earlierGuesses: ["hvs"],
            },
        });

        // A reload: a new page, a new store, the same storage.
        cleanup();
        renderGame(createGameStore(() => window.localStorage));
        expect(guessedNames()).toEqual(["Utrecht Centraal", "Hilversum"]);
        // Kept guesses do not play their arrival again.
        expect(document.querySelector(".guess-enter")).toBeNull();
    });

    it("names a hidden change on an earlier trip once the player guesses it", async () => {
        // The design's case: Amsterdam changes at a hidden station, which
        // the next guess, Utrecht Centraal, turns out to be.
        const hidden: ListedGuess = {
            guess: "asd",
            correct: false,
            steps: [
                { kind: "ride", train: "IC", minutes: 27 },
                { kind: "change", station: null, minutes: 4 },
                { kind: "ride", train: "SPR", minutes: 29 },
            ],
            totalMinutes: 60,
        };
        window.localStorage.setItem(key, serializeGame([hidden]));
        submitGuessFn.mockImplementation(({ data }) =>
            Promise.resolve(
                answer(data, false, [
                    {
                        guess: "asd",
                        steps: [
                            { kind: "ride", train: "IC", minutes: 27 },
                            { kind: "change", station: "ut", minutes: 4 },
                            { kind: "ride", train: "SPR", minutes: 29 },
                        ],
                    },
                ]),
            ),
        );
        const user = renderGame(createGameStore(() => window.localStorage));
        expect(screen.getByText("1h 00m, change at a hidden station")).toBeDefined();

        await guess(user, "Utrecht Centraal");

        expect(
            await screen.findByText("1h 00m, change at Utrecht Centraal"),
        ).toBeDefined();
        expect(window.localStorage.getItem(key)).toContain('"station":"ut"');
    });

    it("plays without storage, keeping nothing", async () => {
        submitGuessFn.mockImplementation(({ data }) =>
            Promise.resolve(answer(data, false)),
        );
        function blocked(): Storage {
            throw new Error("SecurityError");
        }
        const user = renderGame(createGameStore(blocked));

        await guess(user, "Utrecht Centraal");

        await waitFor(() => {
            expect(guessedNames()).toEqual(["Utrecht Centraal"]);
        });
        cleanup();
        renderGame(createGameStore(blocked));
        expect(guessedNames()).toEqual([]);
    });

    it("is won at a correct guess, and the search goes", async () => {
        window.localStorage.setItem(key, serializeGame([miss("hvs")]));
        submitGuessFn.mockImplementation(({ data }) =>
            Promise.resolve(answer(data, true)),
        );
        const user = renderGame(createGameStore(() => window.localStorage));

        await guess(user, "Utrecht Centraal");

        expect(
            await screen.findByText("You tracked it down in 2 of 6."),
        ).toBeDefined();
        expect(screen.queryByRole("combobox")).toBeNull();
        expect(screen.getByText("Found in 2 of 6, newest first")).toBeDefined();
    });

    it("is lost after the sixth wrong guess", () => {
        window.localStorage.setItem(
            key,
            serializeGame(
                ["asd", "ut", "hvs", "mt", "hdr", "gn"].map((code) => miss(code)),
            ),
        );
        renderGame(createGameStore(() => window.localStorage));

        expect(
            screen.getByText(
                "No guesses left. A new mystery station comes at midnight.",
            ),
        ).toBeDefined();
        expect(screen.queryByRole("combobox")).toBeNull();
        expect(screen.getByText("All 6 guesses used, newest first")).toBeDefined();
    });

    it("says so when a guess does not go through, and keeps nothing", async () => {
        submitGuessFn.mockRejectedValue(new Error("rate_limited"));
        const user = renderGame(createGameStore(() => window.localStorage));

        await guess(user, "Utrecht Centraal");

        expect((await screen.findByRole("alert")).textContent).toBe(
            "That guess didn't go through. Try again.",
        );
        expect(window.localStorage.getItem(key)).toBeNull();
    });

    it("speaks Dutch by default", () => {
        overwriteGetLocale(() => "nl");
        renderGame(createGameStore(() => window.localStorage));

        expect(screen.getByText("Vrijdag 6 november, puzzel 142")).toBeDefined();
    });
});
