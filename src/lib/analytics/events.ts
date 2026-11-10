import type { NetworkId } from "@/lib/data/networks";

/** Puzzle metadata only: never pass stations, trips, search text or share text. */
export type PuzzleEventProperties = {
    network: NetworkId;
    puzzle_number: number;
    archive: boolean;
};

/** Every explicit browser event, in addition to PostHog's automatic events. */
export type AnalyticsEventProperties = {
    /** The first successful guess of a new game. */
    puzzle_started: PuzzleEventProperties;
    /** A successful guess, numbered from one. */
    guess_made: PuzzleEventProperties & { guess_number: number };
    /** A successful guess ends the game with a win or a loss. */
    puzzle_solved: PuzzleEventProperties & { guesses_used: number };
    puzzle_missed: PuzzleEventProperties & { guesses_used: number };
    /**
     * The clipboard successfully receives the result. `method` is always
     * `copied`; `shared` came from the share sheet the button once opened.
     */
    result_shared: PuzzleEventProperties & {
        method: "copied";
    };
    /** The first successful archive guess, including a resumed daily game. */
    archive_puzzle_played: PuzzleEventProperties;
};

export type AnalyticsEventName = keyof AnalyticsEventProperties;
