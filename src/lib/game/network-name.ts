import { getLocale } from "@/paraglide/runtime";
import { networks, regionName } from "@/lib/data/networks";
import type { NetworkId } from "@/lib/data/networks";

/**
 * The network's name in the page's language, as the network pill shows it:
 * its country's name ("Nederland", "Netherlands"), so a new network needs
 * no message (docs/network-picker.md#the-picker).
 */
export function networkName(network: NetworkId): string {
    return regionName(networks[network].region, getLocale());
}
