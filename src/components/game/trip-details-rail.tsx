import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One stop's piece of the trip details' vertical line: the colour of the
 * ride that arrives above, the colour of the ride that leaves below, and the
 * stop's marker on the join. A `null` side draws nothing, as at the guess
 * and the mystery station.
 */
export function TripDetailsRail({
    above,
    below,
    children,
}: {
    /** The background class of the ride arriving, or `null` at the start. */
    above: string | null;
    /** The background class of the ride leaving, or `null` at the end. */
    below: string | null;
    /** The stop's marker. */
    children?: ReactNode;
}) {
    return (
        <span
            aria-hidden="true"
            className="relative flex w-5 flex-none items-center justify-center self-stretch"
        >
            {above != null && (
                <span
                    className={cn(
                        "absolute top-0 bottom-1/2 left-1/2 w-1.5 -translate-x-1/2",
                        above,
                    )}
                />
            )}
            {below != null && (
                <span
                    className={cn(
                        "absolute top-1/2 bottom-0 left-1/2 w-1.5 -translate-x-1/2",
                        below,
                    )}
                />
            )}
            {children}
        </span>
    );
}
