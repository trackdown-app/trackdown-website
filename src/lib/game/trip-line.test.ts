import { describe, expect, it } from "vitest";
import {
    boardMinutes,
    gridMarks,
    trainReachesMs,
    tripLineLayout,
    tripRunMs,
} from "@/lib/game/trip-line";
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

    it("stretches only a line shorter than 48px, so its dot shows", () => {
        // 13 minutes of 150 is 29px on a 340px track; 48px is 14.1%.
        expect(tripLineLayout(trip(ride(13)), format).widthPercent).toBeCloseTo(
            (48 / 340) * 100,
        );
        // On a 1000px track the same trip is 87px: on scale.
        expect(
            tripLineLayout(trip(ride(13)), format, 1000).widthPercent,
        ).toBeCloseTo((13 / 150) * 100);
    });

    it("draws a long trip on the board's longer scale, never past the track", () => {
        expect(tripLineLayout(trip(ride(240)), format, 340, 240).widthPercent).toBe(
            100,
        );
        expect(tripLineLayout(trip(ride(120)), format, 340, 240).widthPercent).toBe(
            50,
        );
        expect(tripLineLayout(trip(ride(240)), format).widthPercent).toBe(100);
    });

    it("keeps 29 minutes one width on a board stretched by a long trip", () => {
        // The case from the design review: Vlissingen, 3h 03m, on the board.
        const scale = boardMinutes([{ totalMinutes: 183 }, { totalMinutes: 29 }]);
        function lastRide(layout: ReturnType<typeof tripLineLayout>): number {
            const part = layout.parts.at(-1);
            return part?.kind === "ride" ? part.startPercent - part.endPercent : 0;
        }
        // A desktop track: at phone width 29 minutes of 3h 30 is under 48px,
        // the one case a line is stretched.
        const trackPx = 1000;

        const long = tripLineLayout(
            trip(ride(88), change(null, 9), ride(37), change("ut", 20), ride(29)),
            format,
            trackPx,
            scale,
        );
        const direct = tripLineLayout(trip(ride(29)), format, trackPx, scale);

        expect(lastRide(long)).toBeCloseTo(lastRide(direct));
        expect(lastRide(direct)).toBeCloseTo((29 / 210) * 100);
    });

    it("places each ride by its own minutes, and each change over its wait", () => {
        // 117 minutes on 150: a minute is 2/3 of a percent.
        const layout = tripLineLayout(
            trip(ride(72), change("asd", 9), ride(36)),
            format,
        );

        // The 9-minute wait is 6%, 20.4px on 340px, so the change is the
        // 30px ring. Its right end is 3px over the next ride, which leaves at
        // 24%, so its centre is 12px further: 24% + 12/340 = 27.53%. Each
        // ride's bar runs on under it to there, where the ring's half,
        // 15px, covers it.
        const centre = 24 + (12 / 340) * 100;
        expect(layout.parts).toEqual([
            {
                kind: "ride",
                train: "IC",
                minutes: 72,
                line: 1,
                startPercent: 78,
                endPercent: expect.closeTo(30),
                drawStartPercent: 78,
                drawEndPercent: expect.closeTo(centre),
                insetStartPx: 11,
                insetEndPx: 15,
                label: "IC 1h 12m",
            },
            {
                kind: "change",
                known: true,
                atPercent: expect.closeTo(centre),
                widthPx: 30,
                spanPercent: expect.closeTo(6),
            },
            {
                kind: "ride",
                train: "IC",
                minutes: 36,
                line: 2,
                startPercent: expect.closeTo(24),
                endPercent: 0,
                drawStartPercent: expect.closeTo(centre),
                drawEndPercent: 0,
                insetStartPx: 15,
                insetEndPx: 13,
                label: "IC 36m",
            },
        ]);
    });

    it("lines the changes up before the same last ride, whatever the wait", () => {
        // The design review's case: SPR 29m to the bar after a 3-minute
        // wait, a ring, and after a 17-minute one, a pill.
        function shownLastPx(layout: ReturnType<typeof tripLineLayout>): number {
            const last = layout.parts.at(-1);
            return last?.kind === "ride"
                ? ((last.drawStartPercent - last.drawEndPercent) / 100) * 1000 -
                      last.insetStartPx -
                      last.insetEndPx
                : 0;
        }
        const ring = tripLineLayout(
            trip(ride(37), change(null, 3), ride(29)),
            format,
            1000,
            210,
        );
        const pill = tripLineLayout(
            trip(ride(37), change(null, 17), ride(29)),
            format,
            1000,
            210,
        );

        expect(ring.parts[1]).toMatchObject({ widthPx: 30 });
        expect(shownLastPx(ring)).toBeCloseTo(shownLastPx(pill));
        // 29 minutes, less the 3px the change reaches over and the half of
        // the mystery bar.
        expect(shownLastPx(ring)).toBeCloseTo((29 / 210) * 1000 - 3 - 13);
    });

    it("keeps a ride its own width whatever the wait after it", () => {
        // The design review's case: IC 37m to Utrecht with a 3-minute wait
        // (Rotterdam) and with a 17-minute one (Vlissingen).
        function ic37(layout: ReturnType<typeof tripLineLayout>): number {
            const part = layout.parts.find(
                (candidate) => candidate.kind === "ride" && candidate.minutes === 37,
            );
            return part?.kind === "ride" ? part.startPercent - part.endPercent : 0;
        }
        const short = tripLineLayout(
            trip(ride(37), change(null, 3), ride(29)),
            format,
            1000,
            210,
        );
        const long = tripLineLayout(
            trip(ride(88), change("rtd", 12), ride(37), change(null, 17), ride(29)),
            format,
            1000,
            210,
        );

        expect(ic37(short)).toBeCloseTo((37 / 210) * 100);
        expect(ic37(long)).toBeCloseTo((37 / 210) * 100);
        // The long wait is a pill as long as its 17 minutes.
        expect(long.parts[3]).toMatchObject({
            kind: "change",
            spanPercent: expect.closeTo((17 / 210) * 100),
        });
        // Its bar runs on under both pills to their centres, and what shows
        // of it is its own 37 minutes less the 3px each pill reaches over.
        const middle = long.parts[2];
        expect(middle?.kind).toBe("ride");
        if (middle?.kind === "ride") {
            const shownPx =
                ((middle.drawStartPercent - middle.drawEndPercent) / 100) * 1000 -
                middle.insetStartPx -
                middle.insetEndPx;
            expect(shownPx).toBeCloseTo((37 / 210) * 1000 - 6);
        }
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

describe("the board's scale", () => {
    it("spans 2h 30, or the longest trip rounded up to the half hour", () => {
        expect(boardMinutes([])).toBe(150);
        expect(boardMinutes([{ totalMinutes: 145 }])).toBe(150);
        expect(boardMinutes([{ totalMinutes: 29 }, { totalMinutes: 183 }])).toBe(
            210,
        );
        expect(boardMinutes([{ totalMinutes: 240 }])).toBe(240);
    });

    it("labels every half hour on five columns, only whole hours past six", () => {
        expect(gridMarks(150)).toEqual([
            { minutes: 30, percent: 20 },
            { minutes: 60, percent: 40 },
            { minutes: 90, percent: 60 },
            { minutes: 120, percent: 80 },
        ]);
        expect(gridMarks(180).map((mark) => mark.minutes)).toEqual([
            30, 60, 90, 120, 150,
        ]);
        expect(gridMarks(210).map((mark) => mark.minutes)).toEqual([60, 120, 180]);
    });
});
