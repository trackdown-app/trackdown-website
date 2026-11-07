import { describe, expect, it } from "vitest";
import { overwriteGetLocale } from "@/paraglide/runtime";
import type { getLocale } from "@/paraglide/runtime";
import type { TrainType } from "@/lib/data/data-schema";
import type { ListedGuess } from "@/lib/game/trip-line";
import {
    formatMinutes,
    spokenGuess,
    spokenMinutes,
    trainName,
    tripSummary,
} from "@/lib/game/trip-text";

const names = new Map([
    ["mt", "Maastricht"],
    ["ut", "Utrecht Centraal"],
]);

const maastricht: ListedGuess = {
    guess: "mt",
    correct: false,
    steps: [
        { kind: "ride", train: "IC", minutes: 122 },
        { kind: "change", station: "ut", minutes: 6 },
        { kind: "ride", train: "IC", minutes: 17 },
    ],
    totalMinutes: 145,
};

describe("trainName", () => {
    it("names a Dutch train type in the page's language", () => {
        overwriteGetLocale(() => "en");
        expect(trainName("ST")).toBe("Stopping train");
        overwriteGetLocale(() => "nl");
        expect(trainName("ST")).toBe("Stoptrein");
    });

    it("names a British operator by its brand, in either language", () => {
        const codes: TrainType[] = ["GR", "LD", "TL"];
        const locales: ReturnType<typeof getLocale>[] = ["en", "nl"];
        for (const locale of locales) {
            overwriteGetLocale(() => locale);
            expect(codes.map((code) => trainName(code))).toEqual([
                "LNER",
                "Lumo",
                "Thameslink",
            ]);
        }
    });
});

describe("formatMinutes", () => {
    it("writes hours and padded minutes, or minutes alone", () => {
        overwriteGetLocale(() => "en");
        expect(formatMinutes(145)).toBe("2h 25m");
        expect(formatMinutes(122)).toBe("2h 02m");
        expect(formatMinutes(17)).toBe("17m");
    });

    it("writes hours as u in Dutch", () => {
        expect(formatMinutes(145)).toBe("2u 25m");
    });
});

describe("spokenMinutes", () => {
    it("spells out the units, one and many", () => {
        overwriteGetLocale(() => "en");
        expect(spokenMinutes(145)).toBe("2 hours 25 minutes");
        expect(spokenMinutes(61)).toBe("1 hour 1 minute");
        expect(spokenMinutes(120)).toBe("2 hours");
        expect(spokenMinutes(17)).toBe("17 minutes");
    });

    it("speaks Dutch by default", () => {
        expect(spokenMinutes(61)).toBe("1 uur 1 minuut");
        expect(spokenMinutes(145)).toBe("2 uur 25 minuten");
    });
});

describe("tripSummary", () => {
    it("names the one change when it is known", () => {
        overwriteGetLocale(() => "en");
        expect(tripSummary(maastricht, names)).toBe(
            "2h 25m, change at Utrecht Centraal",
        );
    });

    it("says direct, hidden or how many changes", () => {
        overwriteGetLocale(() => "en");
        const direct: ListedGuess = {
            guess: "ut",
            correct: false,
            steps: [{ kind: "ride", train: "IC", minutes: 17 }],
            totalMinutes: 17,
        };
        const hidden: ListedGuess = {
            ...maastricht,
            steps: [
                { kind: "ride", train: "IC", minutes: 122 },
                { kind: "change", station: null, minutes: 6 },
                { kind: "ride", train: "IC", minutes: 17 },
            ],
        };
        const twice: ListedGuess = {
            ...maastricht,
            steps: [
                { kind: "ride", train: "IC", minutes: 60 },
                { kind: "change", station: null, minutes: 5 },
                { kind: "ride", train: "SPR", minutes: 40 },
                { kind: "change", station: "ut", minutes: 3 },
                { kind: "ride", train: "IC", minutes: 37 },
            ],
        };

        expect(tripSummary(direct, names)).toBe("17m, direct");
        expect(tripSummary(hidden, names)).toBe(
            "2h 25m, change at an unknown station",
        );
        expect(tripSummary(twice, names)).toBe("2h 25m, 2 changes");
    });

    it("summarises in Dutch by default", () => {
        expect(tripSummary(maastricht, names)).toBe(
            "2u 25m, overstap in Utrecht Centraal",
        );
    });
});

describe("spokenGuess", () => {
    it("reads the trip ride by ride", () => {
        overwriteGetLocale(() => "en");
        expect(spokenGuess(maastricht, 4, names)).toBe(
            "Guess 4, Maastricht: 2 hours 25 minutes to the mystery station. IC, 2 hours 2 minutes, change at Utrecht Centraal, 6 minutes, IC, 17 minutes.",
        );
    });

    it("says a correct guess is the mystery station", () => {
        overwriteGetLocale(() => "en");
        expect(
            spokenGuess(
                { guess: "ut", correct: true, steps: [], totalMinutes: 0 },
                5,
                names,
            ),
        ).toBe("Guess 5, Utrecht Centraal: the mystery station.");
    });
});
