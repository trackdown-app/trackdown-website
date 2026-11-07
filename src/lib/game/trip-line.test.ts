import { describe, expect, it } from "vitest";
import { trainReachesMs, tripLineLayout, tripRunMs } from "@/lib/game/trip-line";
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

    it("places each ride by its minutes, the wait at a change in the ride before", () => {
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
                startPercent: 78,
                endPercent: 24,
                insetStartPx: 11,
                insetEndPx: 15,
                label: "IC 1h 12m",
            },
            { kind: "change", known: true, atPercent: 24 },
            {
                kind: "ride",
                train: "IC",
                minutes: 36,
                line: 2,
                startPercent: 24,
                endPercent: 0,
                insetStartPx: 15,
                insetEndPx: 13,
                label: "IC 36m",
            },
        ]);
    });

    it("draws the same minutes the same width, with a change before them or not", () => {
        const direct = tripLineLayout(trip(ride(29)), format).parts.at(-1);
        const changed = tripLineLayout(
            trip(ride(14), change("ut", 4), ride(29)),
            format,
        ).parts.at(-1);

        for (const part of [direct, changed]) {
            expect(part?.kind === "ride" && part.startPercent).toBeCloseTo(
                (29 / 150) * 100,
            );
            expect(part).toMatchObject({ endPercent: 0 });
        }
    });

    it("sizes the labels for the track it is drawn on", () => {
        expect(tripLineLayout(trip(ride(29)), format).parts).toMatchObject([
            { label: "29m" },
        ]);
        expect(tripLineLayout(trip(ride(29)), format, 900).parts).toMatchObject([
            { label: "IC 29m" },
        ]);
    });

    it("drops the train, then the time, as the ride gets short", () => {
        const [timeOnly] = tripLineLayout(trip(ride(30)), format).parts;
        expect(timeOnly).toMatchObject({ label: "30m", endPercent: 0 });

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

        expect(parts[1]).toMatchObject({ kind: "change", known: false });
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

describe("a new guess's run", () => {
    it("takes longer the longer the line", () => {
        expect(tripRunMs(14)).toBe(398);
        expect(tripRunMs(100)).toBe(1000);
    });

    it("reaches a point when the eased run has covered it", () => {
        // The start at once, halfway at half the time, the bar at the end.
        expect(trainReachesMs(60, 60)).toBe(0);
        expect(trainReachesMs(60, 30)).toBe(tripRunMs(60) / 2);
        expect(trainReachesMs(60, 0)).toBe(tripRunMs(60));
        // A quarter of the way takes a third of the time: it pulls away slowly.
        expect(trainReachesMs(60, 45)).toBe(Math.round(tripRunMs(60) / 3));
    });
});
