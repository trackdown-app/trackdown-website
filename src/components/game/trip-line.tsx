import { useRef } from "react";
import { narrowTrackPx, tripLineLayout } from "@/lib/game/trip-line";
import type { ListedGuess, TripLineRide } from "@/lib/game/trip-line";
import { formatMinutes } from "@/lib/game/trip-text";
import { useElementWidth } from "@/lib/use-element-width";

const lineColours: Record<TripLineRide["line"], string> = {
    1: "bg-line-1",
    2: "bg-line-2",
    3: "bg-line-3",
};

/** Centres a dot or ring on its place, given as `right`. */
const marker = "absolute top-1/2 z-1 -translate-y-1/2 translate-x-1/2 rounded-full";

/**
 * One guess's trip as the design draws it (Web · Playing): the guess dot,
 * then each ride in its line colour with a ring at each change, every
 * minute as wide as on every other row. The rides run under the dot and the
 * rings, so the line is unbroken, and end at the right edge, under the
 * list's mystery bar. The labels are sized for the track as measured.
 * Drawn only: the row carries the trip in words for a screen reader.
 */
export function TripLine({
    guess,
}: {
    guess: Pick<ListedGuess, "steps" | "totalMinutes">;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const trackPx = useElementWidth(trackRef, narrowTrackPx);
    const layout = tripLineLayout(guess, formatMinutes, trackPx);

    return (
        <div ref={trackRef} className="relative h-[30px] w-full">
            {layout.parts.map((part, index) =>
                part.kind === "ride" ? (
                    <span
                        // The steps never reorder, so their place is their key.
                        key={index}
                        className={`absolute top-1/2 flex h-[22px] -translate-y-1/2 items-center justify-center overflow-hidden text-on-line ${lineColours[part.line]}`}
                        style={{
                            right: `${part.endPercent}%`,
                            width: `${part.startPercent - part.endPercent}%`,
                            paddingLeft: part.insetStartPx,
                            paddingRight: part.insetEndPx,
                        }}
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
                        className={`${marker} flex size-[30px] items-center justify-center border-4 border-ink bg-surface text-[14px] leading-none font-extrabold text-ink`}
                        style={{ right: `${part.atPercent}%` }}
                    >
                        {part.known ? null : "?"}
                    </span>
                ),
            )}
            <span
                className={`${marker} size-[22px] bg-ink shadow-[0_0_0_3px_var(--td-bg)]`}
                style={{ right: `${layout.widthPercent}%` }}
            />
        </div>
    );
}
