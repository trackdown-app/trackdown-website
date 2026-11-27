import { z } from "@/lib/zod";

/**
 * Every rail network the game has data for. Each one is a folder of its own
 * in the trackdown-data repository's `data/` (docs/data.md#networks). Adding
 * a network adds its id here and its entry to `networks`, and takes it out
 * of `upcomingNetworks`.
 */
export const networkIdSchema = z.enum(["nl", "gb", "lu", "ret", "be"]);

export type NetworkId = z.infer<typeof networkIdSchema>;

/** An ISO 3166-1 alpha-2 region code, upper case: `NL`, `BE`. */
export type RegionCode = string;

export type Network = {
    id: NetworkId;
    /** The network's folder inside the data directory. */
    dataDir: string;
    /**
     * The code on its chip, beside its name: its country's (`NL`), or, for a
     * network that is not a whole country, one of its own (`LU`, `RET`).
     */
    code: string;
    /**
     * The country it covers, which names it in every language (`regionName`),
     * or `null` for a network inside a country, such as the London
     * Underground, which has a name of its own (`networkName`,
     * `src/lib/game/network-name.ts`).
     */
    region: RegionCode | null;
};

export const networks: Record<NetworkId, Network> = {
    nl: { id: "nl", dataDir: "nl", code: "NL", region: "NL" },
    gb: { id: "gb", dataDir: "gb", code: "GB", region: "GB" },
    lu: { id: "lu", dataDir: "lu", code: "LU", region: null },
    ret: { id: "ret", dataDir: "ret", code: "RET", region: null },
    be: { id: "be", dataDir: "be", code: "BE", region: "BE" },
};

export const networkIds: ReadonlyArray<NetworkId> = networkIdSchema.options;

/** The network a visitor who has not chosen one plays. */
export const defaultNetwork: NetworkId = "nl";

/**
 * The networks the picker shows as coming later, in its order: no data yet,
 * so nothing to play. A network leaves this list when it joins `networks`.
 */
export const upcomingNetworks: ReadonlyArray<RegionCode> = ["DE", "CH", "JP"];

/**
 * The name of `region` in `locale`, the country's name from the runtime's
 * own data: "Nederland", "Netherlands". Falls back to the code. A network is
 * named after its region (`networkName`, `src/lib/game/network-name.ts`).
 */
export function regionName(region: RegionCode, locale: string): string {
    return new Intl.DisplayNames([locale], { type: "region" }).of(region) ?? region;
}
