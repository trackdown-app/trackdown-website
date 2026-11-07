import { useRef } from "react";
import type { CSSProperties } from "react";
import {
    changeMinPx,
    changeOverlapPx,
    narrowTrackPx,
    trainReachesMs,
    tripLineLayout,
    tripRunMs,
} from "@/lib/game/trip-line";
import type { ListedGuess, TripLineRide } from "@/lib/game/trip-line";
import { formatMinutes } from "@/lib/game/trip-text";
import { useElementWidth } from "@/lib/use-element-width";

const lineColours: Record<TripLineRide["line"], string> = {
    1: "bg-line-1",
    2: "bg-line-2",
    3: "bg-line-3",
};

/**
 * Glides a part to its new place when the board's scale changes, as when a
 * longer trip arrives and every row draws smaller.
 */
const rescale =
    "transition-[right,width] duration-500 ease-[cubic-bezier(0.37,0,0.63,1)] motion-reduce:transition-none";

/** Centres a dot or ring on its place, given as `right`. */
const marker = `absolute top-1/2 z-1 -translate-y-1/2 translate-x-1/2 rounded-full ${rescale}`;

/**
 * One guess's trip as the design draws it (Web · Playing): the guess dot,
 * then each ride in its line colour, every minute as wide as on every other
 * row, and at each change a ring that stretches into a pill as long as the
 * wait. The dot and the pills reach over the rides beside them, so the line
 * is unbroken; it ends at the right edge, under the list's mystery bar. The labels are sized for the track as measured.
 * Drawn only: the row carries the trip in words for a screen reader.
 *
 * It carries the classes and timings of a new guess's animation
 * (`trip-dot`, `trip-rides`, `trip-ring`, `trip-label`, `--trip-ms`,
 * `--trip-width`, `--ring-delay`); they only move inside a row marked
 * `guess-enter` (docs/guess-list.md#a-new-guess).
 */
export function TripLine({
    guess,
    scaleMinutes,
}: {
    guess: Pick<ListedGuess, "steps" | "totalMinutes">;
    /** The minutes the board's track spans, shared by every row (`boardMinutes`). */
    scaleMinutes: number;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const trackPx = useElementWidth(trackRef, narrowTrackPx);
    const layout = tripLineLayout(guess, formatMinutes, trackPx, scaleMinutes);
    const timing: CSSProperties & Record<`--${string}`, string> = {
        "--trip-ms": `${tripRunMs(layout.widthPercent)}ms`,
        "--trip-width": `${layout.widthPercent}%`,
    };

    return (
        <div ref={trackRef} className="relative h-[30px] w-full" style={timing}>
            <div className="trip-rides absolute inset-0">
                {layout.parts.map((part, index) =>
                    part.kind === "ride" ? (
                        <span
                            // The steps never reorder, so their place is their key.
                            key={index}
                            className={`absolute top-1/2 flex h-[22px] -translate-y-1/2 items-center justify-center overflow-hidden text-on-line ${rescale} ${lineColours[part.line]}`}
                            style={{
                                right: `${part.endPercent}%`,
                                width: `${part.startPercent - part.endPercent}%`,
                                paddingLeft: part.insetStartPx,
                                paddingRight: part.insetEndPx,
                            }}
                        >
                            {part.label != null && (
                                <span className="trip-label px-[5px] text-[13px] font-bold whitespace-nowrap">
                                    {part.label}
                                </span>
                            )}
                        </span>
                    ) : null,
                )}
            </div>
            {layout.parts.map((part, index) => {
                if (part.kind !== "change") {
                    return null;
                }
                const ringStyle: CSSProperties & Record<`--${string}`, string> = {
                    right: `${part.atPercent}%`,
                    // As long as the wait, reaching a little over each ride,
                    // and never smaller than the 30px ring.
                    width: `max(${changeMinPx}px, calc(${part.spanPercent}% + ${2 * changeOverlapPx}px))`,
                    // Drops in as the train arrives at the station.
                    "--ring-delay": `${trainReachesMs(layout.widthPercent, part.atPercent + part.spanPercent / 2)}ms`,
                };
                return (
                    <span
                        key={index}
                        className={`trip-ring ${marker} flex h-[30px] items-center justify-center border-4 border-ink bg-surface text-[14px] leading-none font-extrabold text-ink`}
                        style={ringStyle}
                    >
                        {part.known ? null : "?"}
                    </span>
                );
            })}
            <span
                className={`trip-dot ${marker} size-[22px] bg-ink shadow-[0_0_0_3px_var(--td-bg)]`}
                style={{ right: `${layout.widthPercent}%` }}
            />
        </div>
    );
}
