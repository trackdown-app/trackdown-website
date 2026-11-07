import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { m } from "@/paraglide/messages";
import { localizeHref } from "@/paraglide/runtime";
import { cn } from "@/lib/utils";
import { networkArchivePath } from "@/lib/site-paths";
import { AnswerPlate } from "@/components/game/answer-plate";
import { GuessList } from "@/components/game/guess-list";
import { ShareButton } from "@/components/game/share-button";
import { SharePreview } from "@/components/game/share-preview";
import { buttonVariants } from "@/components/ui/button";
import { revealQueryOptions } from "@/lib/game/reveal.queries";
import type { ShareNavigator } from "@/lib/game/share-result";
import { shareText } from "@/lib/game/share-text";
import type { GuessableStation, TodayPuzzleOutput } from "@/lib/game/schemas";
import type { ListedGuess } from "@/lib/game/trip-line";

type GameOverProps = {
    puzzle: Pick<TodayPuzzleOutput, "network" | "number" | "maxGuesses">;
    /** The network's stations, to name the answer, the guesses and their changes. */
    stations: readonly Pick<GuessableStation, "code" | "name">[];
    /** The finished game's guesses, oldest first, as kept. */
    guesses: readonly ListedGuess[];
    /** Found the station, or ran out of guesses. */
    status: "won" | "lost";
    /** A puzzle of the archive: the plate is not "today's" answer. */
    archive?: boolean;
    /** The guess that ended the game, when it was made on this page. */
    enteringGuess?: string | undefined;
    /** Where the result is shared; the browser's `navigator` unless a test hands its own. */
    shareTarget?: ShareNavigator | undefined;
};

/**
 * The finished game, after the design's Web · Solved board
 * (docs/game.md#solved-and-missed): the answer plate, the buttons to share
 * the result and play an older puzzle, "How you got there", every guess
 * with every change named, and "What you'll share" (docs/share.md). The
 * answer only ever comes from the `reveal` operation, asked once the game is
 * over; the shared text never needs it.
 */
export function GameOver({
    puzzle,
    stations,
    guesses,
    status,
    archive = false,
    enteringGuess,
    shareTarget,
}: GameOverProps) {
    const share = shareText({
        network: puzzle.network,
        number: puzzle.number,
        maxGuesses: puzzle.maxGuesses,
        guesses,
        status,
    });
    const codes = useMemo(() => guesses.map((kept) => kept.guess), [guesses]);
    const reveal = useQuery(
        revealQueryOptions(puzzle.network, puzzle.number, codes),
    );
    const station =
        reveal.data == null
            ? null
            : (stations.find((candidate) => candidate.code === reveal.data.station)
                  ?.name ?? reveal.data.station);

    // The search the player just used is gone: move focus to the answer
    // once it is in, so a keyboard or screen reader carries on from there.
    const headingRef = useRef<HTMLHeadingElement>(null);
    const focused = useRef(false);
    const settled = station != null || reveal.isError;
    useEffect(() => {
        if (enteringGuess != null && settled && !focused.current) {
            focused.current = true;
            headingRef.current?.focus();
        }
    }, [enteringGuess, settled]);

    const outcome =
        status === "won"
            ? m["gameOver.won"]({
                  count: guesses.length,
                  total: puzzle.maxGuesses,
              })
            : m["gameOver.lost"]();

    return (
        <div className="flex flex-col gap-14">
            <section
                aria-label={
                    archive ? m["gameOver.archiveLabel"]() : m["gameOver.label"]()
                }
                className="flex flex-col gap-5"
            >
                <AnswerPlate
                    outcome={outcome}
                    station={station}
                    failed={reveal.isError}
                    onRetry={() => {
                        void reveal.refetch();
                    }}
                    headingRef={headingRef}
                />
                <div className="flex flex-wrap gap-3">
                    <ShareButton text={share} target={shareTarget} />
                    <a
                        href={localizeHref(networkArchivePath(puzzle.network))}
                        className={cn(
                            buttonVariants({ variant: "outline", size: "lg" }),
                            "rounded-lg border-2 px-5.5",
                        )}
                    >
                        {m["gameOver.olderPuzzle"]()}
                    </a>
                </div>
            </section>
            {reveal.data != null && (
                <GuessList
                    guesses={reveal.data.guesses}
                    stations={stations}
                    enteringGuess={enteringGuess}
                    revealed
                />
            )}
            <SharePreview text={share} />
        </div>
    );
}
