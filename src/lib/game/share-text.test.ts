import { describe, expect, it } from "vitest";
import { overwriteGetLocale } from "@/paraglide/runtime";
import type { ListedGuess } from "@/lib/game/trip-line";
import {
    shareGrid,
    shareLine,
    shareMinutes,
    shareText,
} from "@/lib/game/share-text";

const names = [
    "Maastricht",
    "Utrecht Centraal",
    "Den Helder",
    "Amsterdam Centraal",
    "Hilversum",
    "Amersfoort Centraal",
];

// The design's game: four misses, then Amersfoort Centraal.
const guesses: ListedGuess[] = [
    {
        guess: "mt",
        correct: false,
        steps: [
            { kind: "ride", train: "IC", minutes: 122 },
            { kind: "change", station: "ut", minutes: 6 },
            { kind: "ride", train: "IC", minutes: 17 },
        ],
        totalMinutes: 145,
    },
    {
        guess: "hdr",
        correct: false,
        steps: [
            { kind: "ride", train: "IC", minutes: 72 },
            { kind: "change", station: null, minutes: 9 },
            { kind: "ride", train: "IC", minutes: 36 },
        ],
        totalMinutes: 117,
    },
    {
        guess: "ut",
        correct: false,
        steps: [{ kind: "ride", train: "IC", minutes: 17 }],
        totalMinutes: 17,
    },
    {
        guess: "hvs",
        correct: false,
        steps: [{ kind: "ride", train: "SPR", minutes: 13 }],
        totalMinutes: 13,
    },
    { guess: "amf", correct: true, steps: [], totalMinutes: 0 },
];

describe("shareMinutes", () => {
    it("writes hours and padded minutes, or minutes alone", () => {
        overwriteGetLocale(() => "en");
        expect(shareMinutes(145)).toBe("2h25");
        expect(shareMinutes(62)).toBe("1h02");
        expect(shareMinutes(17)).toBe("17m");
    });

    it("writes hours as u in Dutch", () => {
        expect(shareMinutes(145)).toBe("2u25");
    });
});

describe("shareLine", () => {
    it("draws a stretch per 15 minutes of riding and a ring per change", () => {
        expect(shareLine(guesses[0] ?? { steps: [] })).toBe("●━━━━━━━━○━");
    });

    it("draws at least one stretch for a short ride", () => {
        expect(
            shareLine({ steps: [{ kind: "ride", train: "SPR", minutes: 4 }] }),
        ).toBe("●━");
    });
});

describe("shareGrid", () => {
    it("lists the misses oldest first with their times lined up", () => {
        overwriteGetLocale(() => "en");
        expect(shareGrid(guesses)).toEqual([
            "●━━━━━━━━○━  2h25",
            "●━━━━━○━━    1h57",
            "●━           17m",
            "●━           13m",
        ]);
    });
});

describe("shareText", () => {
    it("is the design's text for a won game", () => {
        overwriteGetLocale(() => "en");
        expect(
            shareText({
                network: "nl",
                number: 142,
                maxGuesses: 6,
                guesses,
                status: "won",
            }),
        ).toBe(
            [
                "Trackdown NL 142, 5/6",
                "●━━━━━━━━○━  2h25",
                "●━━━━━○━━    1h57",
                "●━           17m",
                "●━           13m",
                "Tracked down in 5",
            ].join("\n"),
        );
    });

    it("scores a lost game X and lists all six guesses", () => {
        overwriteGetLocale(() => "en");
        const misses: ListedGuess[] = Array.from({ length: 6 }, (_, index) => ({
            guess: `s${index}`,
            correct: false,
            steps: [{ kind: "ride", train: "IC", minutes: 30 }],
            totalMinutes: 30,
        }));
        const text = shareText({
            network: "nl",
            number: 142,
            maxGuesses: 6,
            guesses: misses,
            status: "lost",
        });
        const lines = text.split("\n");
        expect(lines[0]).toBe("Trackdown NL 142, X/6");
        expect(lines).toHaveLength(8);
        expect(lines.at(-1)).toBe("Not tracked down");
    });

    it("speaks Dutch", () => {
        const text = shareText({
            network: "nl",
            number: 142,
            maxGuesses: 6,
            guesses,
            status: "won",
        });
        expect(text.split("\n").at(-1)).toBe("Gevonden in 5");
        expect(text).toContain("2u25");
    });

    it("never names a station, nor its code", () => {
        for (const locale of ["en", "nl"] as const) {
            overwriteGetLocale(() => locale);
            for (const status of ["won", "lost"] as const) {
                const text = shareText({
                    network: "nl",
                    number: 142,
                    maxGuesses: 6,
                    guesses,
                    status,
                });
                for (const name of names) {
                    expect(text).not.toContain(name);
                }
                // Only the header's words, the grid's marks, times and the footer.
                const grid = text.split("\n").slice(1, -1);
                for (const line of grid) {
                    expect(line).toMatch(/^●[━○]+ +\d+[hu]?\d*m?$/u);
                }
            }
        }
    });
});
