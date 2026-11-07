// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import {
    gameStatus,
    gameStorageKey,
    parseStoredGame,
    serializeGame,
} from "@/lib/game/game-state";
import { createGameStore } from "@/lib/game/game-store";
import type { ListedGuess } from "@/lib/game/trip-line";

const miss: ListedGuess = {
    guess: "ut",
    correct: false,
    steps: [{ kind: "ride", train: "IC", minutes: 17 }],
    totalMinutes: 17,
};
const hit: ListedGuess = { guess: "asd", correct: true, steps: [], totalMinutes: 0 };

describe("game state", () => {
    it("keys a game by network and puzzle", () => {
        expect(gameStorageKey("nl", 142)).toBe("trackdown:game:v1:nl:142");
    });

    it("reads back what it writes", () => {
        expect(parseStoredGame(serializeGame([miss, hit]))).toEqual([miss, hit]);
    });

    it("reads nothing, broken JSON or another shape as no guesses", () => {
        expect(parseStoredGame(null)).toEqual([]);
        expect(parseStoredGame("{")).toEqual([]);
        expect(parseStoredGame('{"guesses":[{"guess":1}]}')).toEqual([]);
    });

    it("is won at a correct guess and lost after the last", () => {
        expect(gameStatus([], 6)).toBe("playing");
        expect(gameStatus([miss, hit], 6)).toBe("won");
        expect(
            gameStatus(
                Array.from({ length: 6 }, () => miss),
                6,
            ),
        ).toBe("lost");
    });
});

describe("game store", () => {
    it("keeps a write in storage and tells its listeners", () => {
        const store = createGameStore(() => window.localStorage);
        const listener = vi.fn<() => void>();
        store.subscribe(listener);

        store.write("k", "v");

        expect(window.localStorage.getItem("k")).toBe("v");
        expect(store.read("k")).toBe("v");
        expect(listener).toHaveBeenCalledOnce();
    });

    it("still plays when storage is unavailable, without keeping anything", () => {
        const store = createGameStore(() => {
            throw new Error("SecurityError");
        });

        expect(store.read("k")).toBeNull();
        store.write("k", "v");
        expect(store.read("k")).toBe("v");
    });
});
