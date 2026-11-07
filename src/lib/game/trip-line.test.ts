import { describe, expect, it } from "vitest";
import { tripLineLayout } from "@/lib/game/trip-line";
import type { ListedGuess } from "@/lib/game/trip-line";

function format(minutes: number): string {
    return minutes < 60
        ? `${minutes}m`
        : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function ride(minutes: number): ListedGuess["steps"][number] {
    return { kind: "ride", train: "IC", minutes };
}

function change(
    station: string | null,
    minutes: number,
): ListedGuess["steps"][number] {
    return { kind: "change", station, minutes };
}

function trip(...steps: ListedGuess["steps"]) {
    const totalMinutes = steps.reduce((total, step) => total + step.minutes, 0);
    return { steps, totalMinutes };
}

describe("tripLineLayout", () => {
    it("sizes the line by its total time, 150 minutes filling the track", () => {
        expect(tripLineLayout(trip(ride(75)), format).widthPercent).toBeCloseTo(50);
        expect(
            tripLineLayout(trip(ride(122), change("ut", 6), ride(17)), format)
                .widthPercent,
        ).toBeCloseTo(96.67, 1);
    });

    it("keeps a short trip visible and a long one inside the track", () => {
        expect(tripLineLayout(trip(ride(13)), format).widthPercent).toBe(14);
        expect(tripLineLayout(trip(ride(240)), format).widthPercent).toBe(100);
    });

    it("labels a ride with its train and time when both fit", () => {
        const layout = tripLineLayout(
            trip(ride(72), change("asd", 9), ride(36)),
            format,
        );

        expect(layout.parts).toEqual([
            {
                kind: "ride",
                train: "IC",
                minutes: 72,
                line: 1,
                label: "IC 1h 12m",
                last: false,
            },
            { kind: "change", known: true },
            {
                kind: "ride",
                train: "IC",
                minutes: 36,
                line: 2,
                label: "IC 36m",
                last: true,
            },
        ]);
    });

    it("drops the train, then the time, as the ride gets short", () => {
        const [timeOnly] = tripLineLayout(trip(ride(30)), format).parts;
        expect(timeOnly).toMatchObject({ label: "30m", last: true });

        const parts = tripLineLayout(
            trip(ride(122), change(null, 6), ride(17)),
            format,
        ).parts;
        expect(
            parts.map((part) => (part.kind === "ride" ? part.label : "o")),
        ).toEqual(["IC 2h 02m", "o", null]);
        expect(tripLineLayout(trip(ride(13)), format).parts).toMatchObject([
            { label: null },
        ]);
    });

    it("marks a change hidden when its station is not named", () => {
        const parts = tripLineLayout(
            trip(ride(40), change(null, 5), ride(20)),
            format,
        ).parts;

        expect(parts[1]).toEqual({ kind: "change", known: false });
    });

    it("colours the rides in order of the changes, the fourth back in line 1", () => {
        const parts = tripLineLayout(
            trip(
                ride(20),
                change(null, 3),
                ride(20),
                change(null, 3),
                ride(20),
                change(null, 3),
                ride(20),
            ),
            format,
        ).parts;

        expect(
            parts.flatMap((part) => (part.kind === "ride" ? [part.line] : [])),
        ).toEqual([1, 2, 3, 1]);
    });
});
