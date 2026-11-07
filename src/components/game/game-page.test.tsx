// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { GamePage } from "@/components/game/game-page";
import {
    gameStorageKey,
    parseStoredGame,
    serializeGame,
} from "@/lib/game/game-state";
import { createGameStore } from "@/lib/game/game-store";
import type { GameStore } from "@/lib/game/game-store";
import type {
    GuessInput,
    GuessOutput,
    PuzzleArchiveInput,
    PuzzleArchiveOutput,
    RevealInput,
    RevealOutput,
} from "@/lib/game/schemas";
import type { ShareNavigator } from "@/lib/game/share-result";
import type { ListedGuess } from "@/lib/game/trip-line";
import { trackEvent } from "@/lib/analytics/posthog-client";

vi.mock("@/lib/analytics/posthog-client", () => ({ trackEvent: vi.fn() }));

const { submitGuessFn } = vi.hoisted(() => ({
    submitGuessFn: vi.fn<(options: { data: GuessInput }) => Promise<GuessOutput>>(),
}));
vi.mock("@/lib/game/guess.functions", () => ({ submitGuessFn }));
const { revealAnswerFn } = vi.hoisted(() => ({
    revealAnswerFn:
        vi.fn<(options: { data: RevealInput }) => Promise<RevealOutput>>(),
}));
vi.mock("@/lib/game/reveal.functions", () => ({ revealAnswerFn }));
const { getPuzzleArchiveFn } = vi.hoisted(() => ({
    getPuzzleArchiveFn:
        vi.fn<
            (options: { data: PuzzleArchiveInput }) => Promise<PuzzleArchiveOutput>
        >(),
}));
vi.mock("@/lib/game/puzzle-archive.functions", () => ({ getPuzzleArchiveFn }));

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

function renderGame(
    store: GameStore,
    shareTarget: ShareNavigator = {},
    archive = false,
) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <GamePage
                puzzle={puzzle}
                stations={stations}
                store={store}
                shareTarget={shareTarget}
                archive={archive}
            />
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
    return (
        screen
            .queryAllByRole("listitem")
            // The record's guesses needed are list items too.
            .filter(
                (row) => row.closest("[aria-labelledby='statistics-title']") == null,
            )
            .map((row) => row.querySelector(".font-condensed")?.textContent ?? "")
    );
}

/**
 * The reveal of a game at puzzle 142, whose mystery station is Zwolle: every
 * miss changes at Utrecht Centraal, named now.
 */
function reveal(input: RevealInput): RevealOutput {
    const station = "zl";
    return {
        network: input.network,
        number: input.number,
        station,
        solved: input.guesses.at(-1) === station,
        guesses: input.guesses.map((code) =>
            code === station
                ? { guess: code, correct: true, steps: [], totalMinutes: 0 }
                : {
                      guess: code,
                      correct: false,
                      steps: [
                          { kind: "ride", train: "IC", minutes: 30 },
                          { kind: "change", station: "ut", minutes: 5 },
                          { kind: "ride", train: "IC", minutes: 40 },
                      ],
                      totalMinutes: 75,
                  },
        ),
    };
}

beforeEach(() => {
    vi.mocked(trackEvent).mockClear();
    window.localStorage.clear();
    revealAnswerFn.mockReset();
    revealAnswerFn.mockImplementation(({ data }) => Promise.resolve(reveal(data)));
    getPuzzleArchiveFn.mockReset();
    // Puzzles 140 to 142, today's last.
    getPuzzleArchiveFn.mockResolvedValue({
        network: "nl",
        puzzles: [
            { number: 140, date: "2026-11-04" },
            { number: 141, date: "2026-11-05" },
            { number: 142, date: "2026-11-06" },
        ],
    });
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
        expect(trackEvent).toHaveBeenCalledExactlyOnceWith("guess_made", {
            network: "nl",
            puzzle_number: 142,
            archive: false,
            guess_number: 2,
        });
    });

    it("asks in the past tense in the archive and marks the kept game as an archive game", async () => {
        window.localStorage.setItem(key, serializeGame([miss("hvs")]));
        submitGuessFn.mockImplementation(({ data }) =>
            Promise.resolve(answer(data, false)),
        );
        const user = renderGame(
            createGameStore(() => window.localStorage),
            {},
            true,
        );

        expect(
            screen.getByRole("heading", { name: "Which station was the mystery?" }),
        ).toBeDefined();
        expect(parseStoredGame(window.localStorage.getItem(key)).archive).toBe(
            false,
        );

        await guess(user, "Utrecht Centraal");

        await waitFor(() => {
            expect(guessedNames()).toEqual(["Utrecht Centraal", "Hilversum"]);
        });
        expect(parseStoredGame(window.localStorage.getItem(key)).archive).toBe(true);
        expect(vi.mocked(trackEvent).mock.calls).toEqual([
            [
                "archive_puzzle_played",
                { network: "nl", puzzle_number: 142, archive: true },
            ],
            [
                "guess_made",
                {
                    network: "nl",
                    puzzle_number: 142,
                    archive: true,
                    guess_number: 2,
                },
            ],
        ]);
    });

    it.each([false, true])(
        "keeps archive events deduplicated when resumed with archive=%s",
        async (archive) => {
            window.localStorage.setItem(key, serializeGame([miss("hvs")], true));
            submitGuessFn.mockImplementation(({ data }) =>
                Promise.resolve(answer(data, false)),
            );
            const user = renderGame(
                createGameStore(() => window.localStorage),
                {},
                archive,
            );

            await guess(user, "Utrecht Centraal");

            await waitFor(() => {
                expect(guessedNames()).toEqual(["Utrecht Centraal", "Hilversum"]);
            });
            expect(parseStoredGame(window.localStorage.getItem(key)).archive).toBe(
                true,
            );
            expect(trackEvent).toHaveBeenCalledExactlyOnceWith("guess_made", {
                network: "nl",
                puzzle_number: 142,
                archive: true,
                guess_number: 2,
            });
        },
    );

    it("names the archive's answer without calling it today's", () => {
        window.localStorage.setItem(
            key,
            serializeGame([
                { guess: "zl", correct: true, steps: [], totalMinutes: 0 },
            ]),
        );
        renderGame(
            createGameStore(() => window.localStorage),
            {},
            true,
        );

        expect(screen.getByRole("region", { name: "The answer" })).toBeDefined();
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

    it("is won at a correct guess: the answer from the reveal, focused", async () => {
        window.localStorage.setItem(key, serializeGame([miss("hvs")]));
        submitGuessFn.mockImplementation(({ data }) =>
            Promise.resolve(answer(data, true)),
        );
        const user = renderGame(createGameStore(() => window.localStorage));

        await guess(user, "Zwolle");

        const heading = await screen.findByRole("heading", {
            level: 1,
            name: "Zwolle",
        });
        expect(document.activeElement).toBe(heading);
        expect(
            screen.getByText("You tracked it down in 2 of 6 guesses"),
        ).toBeDefined();
        expect(screen.queryByRole("combobox")).toBeNull();
        expect(revealAnswerFn).toHaveBeenCalledTimes(1);
        expect(revealAnswerFn).toHaveBeenCalledWith({
            data: { network: "nl", number: 142, guesses: ["hvs", "zl"] },
        });
        expect(
            screen.getByRole("heading", { level: 2, name: "How you got there" }),
        ).toBeDefined();
        expect(guessedNames()).toEqual(["Zwolle", "Hilversum"]);
        expect(vi.mocked(trackEvent).mock.calls).toEqual([
            [
                "guess_made",
                {
                    network: "nl",
                    puzzle_number: 142,
                    archive: false,
                    guess_number: 2,
                },
            ],
            [
                "puzzle_solved",
                {
                    network: "nl",
                    puzzle_number: 142,
                    archive: false,
                    guesses_used: 2,
                },
            ],
        ]);
        expect(screen.getByText("1h 15m, change at Utrecht Centraal")).toBeDefined();
        expect(screen.getByRole("button", { name: "Share result" })).toBeDefined();
        expect(
            screen
                .getByRole("link", { name: "Play an older puzzle" })
                .getAttribute("href"),
        ).toBe("/en/archief");
    });

    it("is missed after the sixth wrong guess, every change named", async () => {
        const hidden: ListedGuess = {
            guess: "asd",
            correct: false,
            steps: [
                { kind: "ride", train: "IC", minutes: 30 },
                { kind: "change", station: null, minutes: 5 },
                { kind: "ride", train: "IC", minutes: 40 },
            ],
            totalMinutes: 75,
        };
        window.localStorage.setItem(
            key,
            serializeGame([
                hidden,
                ...["hvs", "mt", "hdr", "gn", "ut"].map((code) => miss(code)),
            ]),
        );
        renderGame(createGameStore(() => window.localStorage));

        expect(
            await screen.findByRole("heading", { level: 1, name: "Zwolle" }),
        ).toBeDefined();
        expect(
            screen.getByText("No guesses left. The mystery station was"),
        ).toBeDefined();
        expect(screen.queryByRole("combobox")).toBeNull();
        expect(screen.queryByText(/hidden station/)).toBeNull();
        expect(guessedNames()).toHaveLength(6);
        // A kept game shown again does not steal focus.
        expect(document.activeElement).toBe(document.body);
        expect(trackEvent).not.toHaveBeenCalled();
    });

    it("never names the answer before the reveal answers", async () => {
        // Kept as won: the reveal alone says which station it was.
        window.localStorage.setItem(
            key,
            serializeGame([
                miss("hvs"),
                { guess: "zl", correct: true, steps: [], totalMinutes: 0 },
            ]),
        );
        const pending: { answer?: (output: RevealOutput) => void } = {};
        revealAnswerFn.mockImplementation(
            () =>
                new Promise((resolve) => {
                    pending.answer = resolve;
                }),
        );
        renderGame(createGameStore(() => window.localStorage));

        const heading = await screen.findByRole("heading", { level: 1 });
        expect(heading.textContent).toBe("Loading the answer");
        expect(screen.queryByRole("list", { name: "Your guesses" })).toBeNull();

        pending.answer?.(
            reveal({ network: "nl", number: 142, guesses: ["hvs", "zl"] }),
        );
        expect(
            await screen.findByRole("heading", { level: 1, name: "Zwolle" }),
        ).toBeDefined();
    });

    it("says so when the reveal fails, and asks again", async () => {
        window.localStorage.setItem(
            key,
            serializeGame(
                ["asd", "ut", "hvs", "mt", "hdr", "gn"].map((code) => miss(code)),
            ),
        );
        revealAnswerFn.mockRejectedValueOnce(new Error("rate_limited"));
        const user = renderGame(createGameStore(() => window.localStorage));

        const alert = await screen.findByRole("alert");
        expect(alert.textContent).toContain("The answer didn't load.");

        await user.click(within(alert).getByRole("button", { name: "Try again" }));

        expect(
            await screen.findByRole("heading", { level: 1, name: "Zwolle" }),
        ).toBeDefined();
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("shows the record once the game is won, today's bar highlighted", async () => {
        window.localStorage.setItem(
            gameStorageKey("nl", 140),
            serializeGame([
                miss("hvs"),
                miss("ut"),
                miss("mt"),
                miss("gn"),
                miss("asd"),
                miss("hdr"),
            ]),
        );
        window.localStorage.setItem(
            gameStorageKey("nl", 141),
            serializeGame([
                { guess: "ut", correct: true, steps: [], totalMinutes: 0 },
            ]),
        );
        window.localStorage.setItem(key, serializeGame([miss("hvs")]));
        submitGuessFn.mockImplementation(({ data }) =>
            Promise.resolve(answer(data, true)),
        );
        const user = renderGame(createGameStore(() => window.localStorage));

        await guess(user, "Zwolle");

        const record = await screen.findByRole("region", {
            name: "Your Netherlands record",
        });
        await within(record).findByText("Played");
        const figures = Object.fromEntries(
            [...record.querySelectorAll("dl > div")].map((pair) => [
                pair.querySelector("dt")?.textContent,
                pair.querySelector("dd")?.textContent,
            ]),
        );
        expect(figures).toEqual({
            Played: "3",
            Won: "67%",
            Streak: "2",
            "Best streak": "2",
        });
        expect(
            within(record)
                .getAllByRole("listitem")
                .map((row) => row.querySelector(".sr-only")?.textContent),
        ).toEqual([
            "1 guess: 1",
            "2 guesses: 1, today's game",
            "3 guesses: 0",
            "4 guesses: 0",
            "5 guesses: 0",
            "6 guesses: 0",
            "Missed: 1",
        ]);
        expect(record.querySelectorAll("[data-today]")).toHaveLength(1);
    });

    it("says so when the record does not load, and asks again", async () => {
        window.localStorage.setItem(
            key,
            serializeGame([
                { guess: "zl", correct: true, steps: [], totalMinutes: 0 },
            ]),
        );
        getPuzzleArchiveFn.mockRejectedValueOnce(new Error("rate_limited"));
        const user = renderGame(createGameStore(() => window.localStorage));

        const record = await screen.findByRole("region", {
            name: "Your Netherlands record",
        });
        const alert = await within(record).findByRole("alert");
        expect(alert.textContent).toContain("Your record didn't load.");

        await user.click(within(alert).getByRole("button", { name: "Try again" }));

        expect(await within(record).findByText("Played")).toBeDefined();
    });

    it("shows no share while the game is on", () => {
        window.localStorage.setItem(key, serializeGame([miss("hvs")]));
        renderGame(createGameStore(() => window.localStorage));

        expect(screen.queryByRole("button", { name: "Share result" })).toBeNull();
        expect(screen.queryByText("What you'll share")).toBeNull();
    });

    it("previews the result, without station names, once the game is won", () => {
        window.localStorage.setItem(
            key,
            serializeGame([
                miss("mt", 145),
                miss("hvs", 13),
                { guess: "ut", correct: true, steps: [], totalMinutes: 0 },
            ]),
        );
        renderGame(createGameStore(() => window.localStorage));

        const preview = document.querySelector("pre")?.textContent ?? "";
        expect(preview).toBe(
            [
                "Trackdown NL 142, 3/6",
                "●━━━━━━━━━━  2h25",
                "●━           13m",
                "Tracked down in 3",
                "https://trackdown.nl/en",
            ].join("\n"),
        );
        for (const station of stations) {
            expect(preview).not.toContain(station.name);
        }
    });

    it("hands the result to the share sheet", async () => {
        window.localStorage.setItem(
            key,
            serializeGame(
                ["asd", "ut", "hvs", "mt", "hdr", "gn"].map((code) => miss(code)),
            ),
        );
        const share = vi.fn(() => Promise.resolve());
        renderGame(
            createGameStore(() => window.localStorage),
            { share },
        );
        const user = userEvent.setup();

        await user.click(screen.getByRole("button", { name: "Share result" }));

        expect(share).toHaveBeenCalledWith({
            text: document.querySelector("pre")?.textContent,
        });
        expect(screen.getByRole("status").textContent).toBe("");
        expect(trackEvent).toHaveBeenCalledExactlyOnceWith("result_shared", {
            network: "nl",
            puzzle_number: 142,
            archive: false,
            method: "shared",
        });
    });

    it("copies the result without the Web Share API, and says so", async () => {
        window.localStorage.setItem(
            key,
            serializeGame([
                miss("hvs"),
                { guess: "ut", correct: true, steps: [], totalMinutes: 0 },
            ]),
        );
        const writeText = vi.fn(() => Promise.resolve());
        renderGame(
            createGameStore(() => window.localStorage),
            {
                clipboard: { writeText },
            },
        );
        const user = userEvent.setup();

        await user.click(screen.getByRole("button", { name: "Share result" }));

        expect(writeText).toHaveBeenCalledWith(
            "Trackdown NL 142, 2/6\n●━  17m\nTracked down in 2\nhttps://trackdown.nl/en",
        );
        expect((await screen.findByRole("status")).textContent).toBe(
            "Copied. Paste it wherever you like.",
        );
        expect(trackEvent).toHaveBeenCalledExactlyOnceWith("result_shared", {
            network: "nl",
            puzzle_number: 142,
            archive: false,
            method: "copied",
        });
    });

    it("says so when the result cannot be copied", async () => {
        window.localStorage.setItem(
            key,
            serializeGame([
                { guess: "ut", correct: true, steps: [], totalMinutes: 0 },
            ]),
        );
        renderGame(
            createGameStore(() => window.localStorage),
            {},
        );
        const user = userEvent.setup();

        await user.click(screen.getByRole("button", { name: "Share result" }));

        expect(
            await screen.findByText(
                "Couldn't copy. Select the text under “What you'll share” and copy it yourself.",
            ),
        ).toBeDefined();
        expect(trackEvent).not.toHaveBeenCalled();
    });

    it("says so when a guess does not go through, and keeps nothing", async () => {
        submitGuessFn.mockRejectedValue(new Error("rate_limited"));
        const user = renderGame(createGameStore(() => window.localStorage));

        await guess(user, "Utrecht Centraal");

        expect((await screen.findByRole("alert")).textContent).toBe(
            "That guess didn't go through. Try again.",
        );
        expect(window.localStorage.getItem(key)).toBeNull();
        expect(trackEvent).not.toHaveBeenCalled();
    });

    it("tracks the first accepted guess once, without replaying it on reload", async () => {
        submitGuessFn.mockImplementation(({ data }) =>
            Promise.resolve(answer(data, false)),
        );
        const user = renderGame(createGameStore(() => window.localStorage));
        expect(trackEvent).not.toHaveBeenCalled();

        await guess(user, "Utrecht Centraal");
        await waitFor(() => expect(trackEvent).toHaveBeenCalledTimes(2));
        expect(vi.mocked(trackEvent).mock.calls).toEqual([
            [
                "puzzle_started",
                { network: "nl", puzzle_number: 142, archive: false },
            ],
            [
                "guess_made",
                {
                    network: "nl",
                    puzzle_number: 142,
                    archive: false,
                    guess_number: 1,
                },
            ],
        ]);

        cleanup();
        renderGame(createGameStore(() => window.localStorage));
        expect(trackEvent).toHaveBeenCalledTimes(2);
    });

    it("tracks a new archive game and a first-guess win in order", async () => {
        submitGuessFn.mockImplementation(({ data }) =>
            Promise.resolve(answer(data, true)),
        );
        const user = renderGame(
            createGameStore(() => window.localStorage),
            {},
            true,
        );
        await guess(user, "Zwolle");

        await waitFor(() => expect(trackEvent).toHaveBeenCalledTimes(4));
        expect(vi.mocked(trackEvent).mock.calls).toEqual([
            ["puzzle_started", { network: "nl", puzzle_number: 142, archive: true }],
            [
                "archive_puzzle_played",
                { network: "nl", puzzle_number: 142, archive: true },
            ],
            [
                "guess_made",
                {
                    network: "nl",
                    puzzle_number: 142,
                    archive: true,
                    guess_number: 1,
                },
            ],
            [
                "puzzle_solved",
                {
                    network: "nl",
                    puzzle_number: 142,
                    archive: true,
                    guesses_used: 1,
                },
            ],
        ]);

        cleanup();
        renderGame(
            createGameStore(() => window.localStorage),
            {},
            true,
        );
        expect(trackEvent).toHaveBeenCalledTimes(4);
    });

    it("tracks a loss only when the last guess is accepted", async () => {
        window.localStorage.setItem(
            key,
            serializeGame(
                ["asd", "hvs", "mt", "hdr", "gn"].map((code) => miss(code)),
            ),
        );
        submitGuessFn.mockImplementation(({ data }) =>
            Promise.resolve(answer(data, false)),
        );
        const user = renderGame(createGameStore(() => window.localStorage));
        await guess(user, "Utrecht Centraal");

        await waitFor(() => expect(trackEvent).toHaveBeenCalledTimes(2));
        expect(vi.mocked(trackEvent).mock.calls).toEqual([
            [
                "guess_made",
                {
                    network: "nl",
                    puzzle_number: 142,
                    archive: false,
                    guess_number: 6,
                },
            ],
            [
                "puzzle_missed",
                {
                    network: "nl",
                    puzzle_number: 142,
                    archive: false,
                    guesses_used: 6,
                },
            ],
        ]);
    });

    it("does not track a duplicate response already saved by another tab", async () => {
        const store = createGameStore(() => window.localStorage);
        submitGuessFn.mockImplementation(({ data }) => {
            store.write(key, serializeGame([answer(data, false)]));
            return Promise.resolve(answer(data, false));
        });
        const user = renderGame(store);
        await guess(user, "Utrecht Centraal");

        await waitFor(() => expect(guessedNames()).toEqual(["Utrecht Centraal"]));
        expect(trackEvent).not.toHaveBeenCalled();
    });

    it("does not track a cancelled share", async () => {
        window.localStorage.setItem(
            key,
            serializeGame([
                { guess: "zl", correct: true, steps: [], totalMinutes: 0 },
            ]),
        );
        const user = renderGame(
            createGameStore(() => window.localStorage),
            {
                share: () =>
                    Promise.reject(new DOMException("Closed", "AbortError")),
            },
        );
        await user.click(screen.getByRole("button", { name: "Share result" }));
        expect(trackEvent).not.toHaveBeenCalled();
    });

    it("ignores an in-flight guess when another tab finishes the game", async () => {
        const store = createGameStore(() => window.localStorage);
        submitGuessFn.mockImplementation(({ data }) => {
            store.write(
                key,
                serializeGame([
                    { guess: "zl", correct: true, steps: [], totalMinutes: 0 },
                ]),
            );
            return Promise.resolve(answer(data, false));
        });
        const user = renderGame(store);
        await guess(user, "Utrecht Centraal");

        await screen.findByRole("heading", { level: 1, name: "Zwolle" });
        expect(parseStoredGame(store.read(key)).guesses).toHaveLength(1);
        expect(trackEvent).not.toHaveBeenCalled();
    });

    it("speaks Dutch by default", () => {
        overwriteGetLocale(() => "nl");
        renderGame(createGameStore(() => window.localStorage));

        expect(screen.getByText("Vrijdag 6 november, puzzel 142")).toBeDefined();
    });
});
