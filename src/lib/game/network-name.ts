import { m } from "@/paraglide/messages";
import type { NetworkId } from "@/lib/data/networks";

const names: Record<NetworkId, () => string> = {
    nl: () => m["header.networkNl"](),
};

/** The network's name in the page's language, as the network pill shows it. */
export function networkName(network: NetworkId): string {
    return names[network]();
}
