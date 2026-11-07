import { z } from "zod";

/**
 * Every rail network the game has data for. Each one is a folder of its own
 * in the trackdown-data repository's `data/` (docs/data.md#networks). Adding
 * a network adds its id here and its entry to `networks`, and takes it out
 * of `upcomingNetworks`.
 */
export const networkIdSchema = z.enum(["nl"]);

export type NetworkId = z.infer<typeof networkIdSchema>;

/** An ISO 3166-1 alpha-2 region code, upper case: `NL`, `BE`. */
export type RegionCode = string;

export type Network = {
    id: NetworkId;
    /** The network's folder inside the data directory. */
    dataDir: string;
    /** The country it covers, which names it in every language (`regionName`). */
    region: RegionCode;
};

export const networks: Record<NetworkId, Network> = {
    nl: { id: "nl", dataDir: "nl", region: "NL" },
};

export const networkIds: ReadonlyArray<NetworkId> = networkIdSchema.options;

/** The network a visitor who has not chosen one plays. */
export const defaultNetwork: NetworkId = "nl";

/**
 * The networks the picker shows as coming later, in its order: no data yet,
 * so nothing to play. A network leaves this list when it joins `networks`.
 */
export const upcomingNetworks: ReadonlyArray<RegionCode> = [
    "BE",
    "DE",
    "CH",
    "GB",
    "JP",
];

/**
 * The name of `region` in `locale`, the country's name from the runtime's
 * own data: "Nederland", "Netherlands". Falls back to the code. A network is
 * named after its region (`networkName`, `src/lib/game/network-name.ts`).
 */
export function regionName(region: RegionCode, locale: string): string {
    return new Intl.DisplayNames([locale], { type: "region" }).of(region) ?? region;
}
