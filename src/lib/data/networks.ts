import { z } from "zod";

/**
 * Every rail network the game has data for. Each one is a folder of its own
 * in the trackdown-data repository's `data/` (docs/data.md#networks). Adding
 * a network adds its id here and its entry to `networks`.
 */
export const networkIdSchema = z.enum(["nl"]);

export type NetworkId = z.infer<typeof networkIdSchema>;

export type Network = {
    id: NetworkId;
    /** The network's folder inside the data directory. */
    dataDir: string;
};

export const networks: Record<NetworkId, Network> = {
    nl: { id: "nl", dataDir: "nl" },
};

export const networkIds: ReadonlyArray<NetworkId> = networkIdSchema.options;
