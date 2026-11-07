import { m } from "@/paraglide/messages";
import type { NetworkId } from "@/lib/data/networks";
import type { GameStatus } from "@/lib/game/game-state";
import type { ListedGuess } from "@/lib/game/trip-line";

// The text a player shares once a game is over (docs/share.md): a header
// with the puzzle and the score, one line per wrong guess in the order they
// were made, and a footer. It never names a station, so it never gives the
// answer away.

/** One stretch of line in the grid stands for this many minutes of riding. */
export const cellMinutes = 15;

/** The guess's start, a ride and a change, as the grid draws them. */
const startMark = "●";
const rideMark = "━";
const changeMark = "○";

/** A time as the grid writes it: `2h25`, or `17m` under an hour. */
export function shareMinutes(minutes: number): string {
    if (minutes < 60) {
        return m["share.minutes"]({ minutes: String(minutes) });
    }
    return m["share.hoursMinutes"]({
        hours: String(Math.floor(minutes / 60)),
        minutes: String(minutes % 60).padStart(2, "0"),
    });
}

/**
 * A guess's trip as one run of characters: a dot for the guess, a stretch of
 * line per ride (one per 15 minutes, at least one) and a ring per change.
 * The change's station is never written, known or not.
 */
export function shareLine(guess: Pick<ListedGuess, "steps">): string {
    let line = startMark;
    for (const step of guess.steps) {
        line +=
            step.kind === "ride"
                ? rideMark.repeat(
                      Math.max(1, Math.round(step.minutes / cellMinutes)),
                  )
                : changeMark;
    }
    return line;
}

/**
 * The grid: every wrong guess, oldest first, its line and then its time,
 * the times lined up two spaces past the longest line. The correct guess
 * has no trip, so it has no line; the footer counts it.
 */
export function shareGrid(guesses: readonly ListedGuess[]): string[] {
    const lines = guesses
        .filter((guess) => !guess.correct)
        .map((guess) => ({
            line: shareLine(guess),
            time: shareMinutes(guess.totalMinutes),
        }));
    const width = lines.reduce((most, row) => Math.max(most, row.line.length), 0);
    return lines.map((row) => `${row.line.padEnd(width + 2)}${row.time}`);
}

export type ShareTextInput = {
    network: NetworkId;
    number: number;
    maxGuesses: number;
    guesses: readonly ListedGuess[];
    /** Only a game that is over is shared. */
    status: Exclude<GameStatus, "playing">;
};

/**
 * The whole text, in the page's locale:
 *
 * ```
 * Trackdown NL 142, 5/6
 * ●━━━━━━━━○━  2h25
 * ●━━━━━○━━    1h57
 * ●━           17m
 * ●━           13m
 * Tracked down in 5
 * https://trackdown.nl/en
 * ```
 *
 * A lost game scores `X/6` and says "Not tracked down". The last line is
 * the site in the page's language, so a friend can play too.
 */
export function shareText({
    network,
    number,
    maxGuesses,
    guesses,
    status,
}: ShareTextInput): string {
    const won = status === "won";
    const header = m["share.header"]({
        network: network.toUpperCase(),
        number: String(number),
        score: won ? String(guesses.length) : "X",
        total: String(maxGuesses),
    });
    const footer = won
        ? m["share.won"]({ count: String(guesses.length) })
        : m["share.lost"]();
    return [header, ...shareGrid(guesses), footer, m["share.url"]()].join("\n");
}
