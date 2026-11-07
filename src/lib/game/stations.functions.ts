import { createServerFn } from "@tanstack/react-start";
import { stationsInputSchema } from "@/lib/game/schemas";
import { serviceContext } from "@/lib/game/service-context";
import { getStations } from "@/lib/game/stations";

/**
 * The `stations` operation for the web; `GET /api/v1/{network}/stations` is
 * the same for iOS.
 */
export const getStationsFn = createServerFn({ method: "GET" })
    .validator(stationsInputSchema)
    .handler(({ data }) => getStations(data, serviceContext));
