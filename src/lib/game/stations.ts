// Marks this module server-only: it reads the game data.
import "@tanstack/react-start/server-only";
import { provinceName } from "@/lib/game/province-names";
import type { StationsInput, StationsOutput } from "@/lib/game/schemas";
import type { ServiceContext } from "@/lib/game/service-context";

/**
 * Every station a player can guess, with its province named in the input's
 * locale. The `stations` operation's one service: the server function and
 * `GET /api/v1/{network}/stations` both answer with what it returns. It reads
 * `stations.json` only, so a station that only appears as a change in a trip
 * (Aachen, Antwerpen) is not in it, and neither is any trip.
 */
export async function getStations(
    input: StationsInput,
    context: ServiceContext,
): Promise<StationsOutput> {
    const stations = await context.data.stations(input.network);
    return {
        network: input.network,
        locale: input.locale,
        // Built field by field, so the coordinates stay behind.
        stations: stations.map((station) => ({
            code: station.code,
            name: station.name,
            province: provinceName(station.province, input.locale),
        })),
    };
}
