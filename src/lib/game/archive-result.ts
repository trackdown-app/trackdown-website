import { m } from "@/paraglide/messages";
import { gameStatus } from "@/lib/game/game-state";
import type { StoredGame } from "@/lib/game/game-state";

/**
 * How the player did at one puzzle of the archive (docs/archive.md#the-list),
 * from the game kept on this device: "Not played yet", "Guess 3 of 6",
 * "Found in 4 of 6" or "Missed".
 */
export function archiveResult(game: StoredGame, maxGuesses: number): string {
    const count = game.guesses.length;
    if (count === 0) {
        return m["archive.unplayed"]();
    }
    switch (gameStatus(game.guesses, maxGuesses)) {
        case "won":
            return m["archive.won"]({ count, total: maxGuesses });
        case "lost":
            return m["archive.lost"]();
        case "playing":
            return m["archive.playing"]({ number: count + 1, total: maxGuesses });
    }
}
