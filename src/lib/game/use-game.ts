import { useMutation } from "@tanstack/react-query";
import { useMemo, useSyncExternalStore } from "react";
import type { StationCode } from "@/lib/data/data-schema";
import { submitGuessFn } from "@/lib/game/guess.functions";
import {
    gameStatus,
    gameStorageKey,
    parseStoredGame,
    serializeGame,
} from "@/lib/game/game-state";
import { gameStore } from "@/lib/game/game-store";
import type { GameStore } from "@/lib/game/game-store";
import type { TodayPuzzleOutput } from "@/lib/game/schemas";

type GuessVariables = {
    guess: StationCode;
    earlierGuesses: StationCode[];
};

/**
 * The player's game at `puzzle` (docs/game.md#game-state): the kept guesses,
 * whether it is over, and `guess`, which sends a guess through the `guess`
 * operation and keeps its answer. The server render has no storage, so it
 * renders a game with no guesses; the browser reads the kept ones as it
 * hydrates. With `archive`, every guess marks the kept game as played in the
 * archive (docs/archive.md#the-streak).
 */
export function useGame(
    puzzle: Pick<TodayPuzzleOutput, "network" | "number" | "maxGuesses">,
    store: GameStore = gameStore,
    archive = false,
) {
    const key = gameStorageKey(puzzle.network, puzzle.number);
    const raw = useSyncExternalStore(
        store.subscribe,
        () => store.read(key),
        () => null,
    );
    const guesses = useMemo(() => parseStoredGame(raw).guesses, [raw]);
    const status = gameStatus(guesses, puzzle.maxGuesses);

    const mutation = useMutation({
        mutationFn: (variables: GuessVariables) =>
            submitGuessFn({
                data: {
                    network: puzzle.network,
                    number: puzzle.number,
                    ...variables,
                },
            }),
        onSuccess: (answer) => {
            // Read again: another tab may have played meanwhile.
            const current = parseStoredGame(store.read(key));
            if (current.guesses.some((kept) => kept.guess === answer.guess)) {
                return;
            }
            // The earlier trips again: a change this guess named shows on
            // them too.
            const again = new Map(
                answer.earlierTrips.map((trip) => [trip.guess, trip.steps]),
            );
            const updated = current.guesses.map((kept) => {
                const steps = again.get(kept.guess);
                return steps == null ? kept : { ...kept, steps };
            });
            // Once played in the archive, always an archive game.
            store.write(
                key,
                serializeGame([...updated, answer], current.archive || archive),
            );
        },
    });

    function guess(station: StationCode) {
        if (status !== "playing" || mutation.isPending) {
            return;
        }
        mutation.mutate({
            guess: station,
            earlierGuesses: guesses.map((kept) => kept.guess),
        });
    }

    return {
        guesses,
        status,
        guess,
        isPending: mutation.isPending,
        isError: mutation.isError,
        /** The answer to the guess made last on this page, for announcing it. */
        lastAnswer: mutation.data,
    };
}
