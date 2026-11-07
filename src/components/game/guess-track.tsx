import { useId, useState } from "react";
import type { CSSProperties } from "react";
import { m } from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import { TripDetails } from "@/components/game/trip-details";
import { TripLine } from "@/components/game/trip-line";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { PopoverContent } from "@/components/ui/popover-content";
import { PopoverTitle } from "@/components/ui/popover-title";
import { gridMinutes } from "@/lib/game/trip-line";
import type { ListedGuess } from "@/lib/game/trip-line";
import { formatMinutes } from "@/lib/game/trip-text";
import type { StationNames } from "@/lib/game/trip-text";
import { useMediaQuery } from "@/lib/use-media-query";

/** A pointer that can hover: a mouse or trackpad, not a finger. */
const hoverQuery = "(hover: hover) and (pointer: fine)";

/**
 * The 30-minute grid behind a trip line on a track spanning `scaleMinutes`:
 * a 1px `grid` rule every half hour, counted from the mystery bar at the
 * right (a fifth of the track at 2 h 30).
 */
function gridBackground(scaleMinutes: number): CSSProperties {
    const step = `${(gridMinutes / scaleMinutes) * 100}%`;
    return {
        backgroundImage: `repeating-linear-gradient(to left, transparent 0, transparent calc(${step} - 1px), var(--td-grid) calc(${step} - 1px), var(--td-grid) ${step})`,
    };
}

const triggerClasses =
    "block w-full cursor-pointer rounded-full bg-transparent p-0 text-left";

type GuessTrackProps = {
    guess: ListedGuess;
    names: StationNames;
    /** The minutes the board's track spans, the same for every row (`boardMinutes`). */
    scaleMinutes: number;
    /** The finished game's list: no time grid behind the track. */
    revealed: boolean;
};

/**
 * A guess row's track (docs/guess-list.md#trip-details): the trip line over
 * the time grid, and the line is a button that shows the trip ride by ride.
 * With a mouse the details open in a popover on hover, focus or click; on a
 * touch screen a tap opens them in the row, under the line, as a popover
 * would cover the rows below and has no hover to open it. A correct guess
 * has no line and nothing to open.
 */
export function GuessTrack({
    guess,
    names,
    scaleMinutes,
    revealed,
}: GuessTrackProps) {
    const canHover = useMediaQuery(hoverQuery);
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const station = names.get(guess.guess) ?? guess.guess;
    const label = m["tripDetails.open"]({ station });
    const line = <TripLine guess={guess} scaleMinutes={scaleMinutes} />;

    let trigger = null;
    if (!guess.correct) {
        trigger = canHover ? (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger
                    openOnHover
                    delay={150}
                    closeDelay={100}
                    aria-label={label}
                    className={triggerClasses}
                >
                    {line}
                </PopoverTrigger>
                <PopoverContent
                    side="bottom"
                    align="end"
                    sideOffset={10}
                    className="w-[min(22rem,calc(100vw-32px))] gap-3"
                >
                    <div>
                        <PopoverTitle className="font-condensed text-[24px] leading-none font-bold">
                            {m["tripDetails.title"]({ station })}
                        </PopoverTitle>
                        <p className="mt-1.5 text-[15px] text-muted-foreground">
                            {m["tripDetails.total"]({
                                duration: formatMinutes(guess.totalMinutes),
                            })}
                        </p>
                    </div>
                    <TripDetails guess={guess} names={names} />
                </PopoverContent>
            </Popover>
        ) : (
            <button
                type="button"
                aria-label={label}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => {
                    setOpen(!open);
                }}
                className={triggerClasses}
            >
                {line}
            </button>
        );
    }

    return (
        <>
            <div
                data-trip-end
                className={cn(
                    "flex min-w-0 flex-[999_1_320px] items-center justify-end bg-clip-content bg-origin-content pr-3",
                    revealed ? "min-h-16" : "min-h-[72px]",
                )}
                style={revealed ? undefined : gridBackground(scaleMinutes)}
            >
                {trigger}
            </div>
            {!canHover && open && (
                <div id={panelId} className="basis-full pr-10 pb-5 pl-[26px]">
                    <TripDetails guess={guess} names={names} />
                </div>
            )}
        </>
    );
}
