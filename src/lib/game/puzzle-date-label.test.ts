import { describe, expect, it } from "vitest";
import { puzzleDateLabel } from "@/lib/game/puzzle-date-label";

describe("puzzleDateLabel", () => {
    it.each([
        ["nl", "Vrijdag 6 november"],
        ["en", "Friday 6 November"],
        ["de", "Freitag, 6. November"],
        ["fr", "Vendredi 6 novembre"],
    ] as const)("names the day in %s", (locale, label) => {
        expect(puzzleDateLabel("2026-11-06", locale)).toBe(label);
    });
});
