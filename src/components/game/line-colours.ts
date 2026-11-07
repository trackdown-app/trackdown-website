import type { TripLineRide } from "@/lib/game/trip-line";

/** The background class of each of the three line colours a trip's rides take. */
export const lineBackgrounds: Record<TripLineRide["line"], string> = {
    1: "bg-line-1",
    2: "bg-line-2",
    3: "bg-line-3",
};
