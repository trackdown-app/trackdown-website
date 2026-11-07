import { useMemo } from "react";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { cn } from "@/lib/utils";
import { shellContainer } from "@/components/layout/shell-container";
import { GameProgress } from "@/components/game/game-progress";
import { GuessList } from "@/components/game/guess-list";
import { ShareButton } from "@/components/game/share-button";
import { SharePreview } from "@/components/game/share-preview";
import { StationSearch } from "@/components/game/station-search";
import { puzzleDateLabel } from "@/lib/game/puzzle-date-label";
import type { GameStore } from "@/lib/game/game-store";
import type { ShareNavigator } from "@/lib/game/share-result";
import { shareText } from "@/lib/game/share-text";
import type { StationOption } from "@/lib/game/station-search";
import type { TodayPuzzleOutput } from "@/lib/game/schemas";
import { spokenGuess } from "@/lib/game/trip-text";
import { useGame } from "@/lib/game/use-game";

type GamePageProps = {
    /** The puzzle to play: the `todayPuzzle` operation's answer. */
    puzzle: TodayPuzzleOutput;
    /** Every station a player can guess: the `stations` operation's answer. */
    stations: readonly StationOption[];
    /** Where the game is kept; the page's `localStorage` store unless a test hands its own. */
    store?: GameStore;
    /** Where a result is shared; the browser's `navigator` unless a test hands its own. */
    shareTarget?: ShareNavigator;
};

/**
 * The game, after the design's Web · Playing board (docs/game.md): the
 * puzzle's day, the question, the station search, the progress dots and the
 * guesses so far, newest first. The guesses survive a reload on the same
 * device. Once the game is over the search gives way to a line saying how
 * it went and the Share result button, and the text it shares shows under
 * the guesses (docs/share.md).
 */
export function GamePage({ puzzle, stations, store, shareTarget }: GamePageProps) {
    const game = useGame(puzzle, store);
    const names = useMemo(
        () => new Map(stations.map((station) => [station.code, station.name])),
        [stations],
    );
    const guessed = useMemo(
        () => game.guesses.map((kept) => kept.guess),
        [game.guesses],
    );

    let outcome: string | null = null;
    if (game.status === "won") {
        outcome = m["game.won"]({
            count: game.guesses.length,
            total: puzzle.maxGuesses,
        });
    } else if (game.status === "lost") {
        outcome = m["game.lost"]();
    }
    const share =
        game.status === "playing"
            ? null
            : shareText({
                  network: puzzle.network,
                  number: puzzle.number,
                  maxGuesses: puzzle.maxGuesses,
                  guesses: game.guesses,
                  status: game.status,
              });

    return (
        <main className={cn(shellContainer, "flex flex-col pt-10 pb-16")}>
            <p className="mb-3 text-base text-muted-foreground">
                {m["game.dateLine"]({
                    date: puzzleDateLabel(puzzle.date, getLocale()),
                    number: puzzle.number,
                })}
            </p>
            <h1 className="max-w-[12em] font-condensed text-[clamp(44px,7vw,72px)] leading-[0.95] font-extrabold tracking-[-0.01em]">
                {m["game.title"]()}
            </h1>
            <p className="mt-5 max-w-[36em] text-[19px] leading-normal text-muted-foreground">
                {m["game.intro"]()}
            </p>
            <div className="mt-8">
                {outcome == null ? (
                    <StationSearch
                        stations={stations}
                        guessed={guessed}
                        guessNumber={game.guesses.length + 1}
                        maxGuesses={puzzle.maxGuesses}
                        onGuess={(station) => {
                            game.guess(station.code);
                        }}
                    />
                ) : (
                    <div className="flex flex-col gap-5">
                        <p className="font-condensed text-[30px] leading-tight font-bold">
                            {outcome}
                        </p>
                        {share != null && (
                            <ShareButton text={share} target={shareTarget} />
                        )}
                    </div>
                )}
                {game.isError && (
                    <p role="alert" className="mt-3 text-base text-destructive">
                        {m["game.guessFailed"]()}
                    </p>
                )}
            </div>
            {/* Reads out each guess made on this page, not the kept ones a
                reload shows. */}
            <p aria-live="polite" className="sr-only">
                {game.lastAnswer == null
                    ? ""
                    : spokenGuess(game.lastAnswer, game.guesses.length, names)}
            </p>
            <div className="mt-12">
                <GuessList
                    guesses={game.guesses}
                    stations={stations}
                    enteringGuess={game.lastAnswer?.guess}
                    progress={
                        <GameProgress
                            guessCount={game.guesses.length}
                            maxGuesses={puzzle.maxGuesses}
                            status={game.status}
                        />
                    }
                />
            </div>
            {share != null && (
                <div className="mt-14">
                    <SharePreview text={share} />
                </div>
            )}
        </main>
    );
}
