/**
 * The browser checks play the committed fixture (`fixtures/trackdown-data`),
 * whose puzzles are dated in June 2026. Today's puzzle is the one dated
 * today, so the checks move the server's clock and the browser's back by the
 * same whole number of days, onto the fixture's middle puzzle. The time of
 * day stays real, so both clocks tick on together, and a run near midnight
 * lands on the puzzle before or after it, which the fixture has too. See
 * docs/accessibility.md#the-clock.
 */
const fixtureDay = "2026-06-20";

const dayMs = 24 * 60 * 60 * 1000;

/** Milliseconds to add to the real time to land on `fixtureDay`. */
export function clockShiftMs(realNow: number): number {
    const today = Date.parse(
        `${new Date(realNow).toISOString().slice(0, 10)}T00:00:00.000Z`,
    );
    return (
        Math.round((Date.parse(`${fixtureDay}T00:00:00.000Z`) - today) / dayMs) *
        dayMs
    );
}
