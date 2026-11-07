import { cn } from "@/lib/utils";
import { tripLineLayout } from "@/lib/game/trip-line";
import type { ListedGuess, TripLineRide } from "@/lib/game/trip-line";
import { formatMinutes } from "@/lib/game/trip-text";

const lineColours: Record<TripLineRide["line"], string> = {
    1: "bg-line-1",
    2: "bg-line-2",
    3: "bg-line-3",
};

/**
 * One guess's trip as the design draws it (Web · Playing): the guess dot,
 * then each ride in its line colour with a ring at each change, as wide as
 * the trip is long. It ends at the right edge, under the list's mystery bar.
 * Drawn only: the row carries the trip in words for a screen reader.
 */
export function TripLine({
    guess,
}: {
    guess: Pick<ListedGuess, "steps" | "totalMinutes">;
}) {
    const layout = tripLineLayout(guess, formatMinutes);

    return (
        <div
            className="flex items-center"
            style={{ width: `${layout.widthPercent.toFixed(1)}%` }}
        >
            <span className="relative z-1 -mr-1 size-[22px] flex-none rounded-full bg-ink shadow-[0_0_0_3px_var(--td-bg)]" />
            {layout.parts.map((part, index) =>
                part.kind === "ride" ? (
                    <span
                        // The steps never reorder, so their place is their key.
                        key={index}
                        className={cn(
                            "flex h-[22px] min-w-0 items-center justify-center overflow-hidden text-on-line",
                            lineColours[part.line],
                            part.last && "pr-[13px]",
                        )}
                        style={{ flex: `${part.minutes} 1 0px` }}
                    >
                        {part.label != null && (
                            <span className="px-[5px] text-[13px] font-bold whitespace-nowrap">
                                {part.label}
                            </span>
                        )}
                    </span>
                ) : (
                    <span
                        key={index}
                        className="relative z-1 -mx-[3px] flex size-[30px] flex-none items-center justify-center rounded-full border-4 border-ink bg-surface text-[14px] leading-none font-extrabold text-ink"
                    >
                        {part.known ? null : "?"}
                    </span>
                ),
            )}
        </div>
    );
}
