import { m } from "@/paraglide/messages";
import type { GameStatus } from "@/lib/game/game-state";

/** One dot and the gap after it: 12px and 16px, as on the design. */
const dotPitchPx = 28;

type GameProgressProps = {
    /** How many guesses the player made. */
    guessCount: number;
    /** How many guesses the puzzle allows. */
    maxGuesses: number;
    status: GameStatus;
};

/**
 * The progress dots from the design's Web · Playing board
 * (docs/game.md#progress): a filled dot per guess made, an ink ring for the
 * guess now, an empty ring for each still to come, on a line inked up to the
 * last of them; then which guess this is, in words. The dots are hidden from
 * screen readers; the words say the same.
 */
export function GameProgress({ guessCount, maxGuesses, status }: GameProgressProps) {
    const reached = status === "playing" ? guessCount : guessCount - 1;
    const dots = Array.from({ length: maxGuesses }, (_, index) => {
        if (index < guessCount) {
            return "bg-ink";
        }
        return index === guessCount && status === "playing"
            ? "border-3 border-ink bg-background"
            : "border-3 border-empty bg-background";
    });

    let label: string;
    if (status === "won") {
        label = m["progress.won"]({ count: guessCount, total: maxGuesses });
    } else if (status === "lost") {
        label = m["progress.lost"]({ total: maxGuesses });
    } else {
        label = m["progress.playing"]({
            number: guessCount + 1,
            total: maxGuesses,
        });
    }

    return (
        <div className="flex items-center gap-3.5">
            <div aria-hidden="true" className="relative flex items-center gap-4">
                <span className="absolute inset-x-1.5 top-1/2 -mt-[1.5px] h-[3px] bg-empty" />
                <span
                    className="absolute left-1.5 top-1/2 -mt-[1.5px] h-[3px] bg-ink"
                    style={{ width: Math.max(0, reached) * dotPitchPx }}
                />
                {dots.map((className, index) => (
                    <span
                        // The dots never reorder.
                        key={index}
                        className={`relative box-border size-3 rounded-full ${className}`}
                    />
                ))}
            </div>
            <span className="text-base font-semibold">{label}</span>
        </div>
    );
}
