// Marks this module server-only: it hands the services the game data.
import "@tanstack/react-start/server-only";
import type { GameData } from "@/lib/data/game-data";
import { gameData } from "@/lib/data/trackdown-data";

/**
 * Everything a service reads besides its input. Services take it as an
 * argument, so a test hands them the fixture instead (docs/api.md#services).
 */
export type ServiceContext = {
    data: GameData;
    /** The trackdown-data commit the build was made from, or `local`. */
    dataRef: string;
    /** The current time, which decides today's puzzle; a test fixes it. */
    now: () => Date;
};

/** The context the server function and the REST route call the services with. */
export const serviceContext: ServiceContext = {
    data: gameData,
    dataRef: import.meta.env.TRACKDOWN_DATA_REF,
    now: () => new Date(),
};
