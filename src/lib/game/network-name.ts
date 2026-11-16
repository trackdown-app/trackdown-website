import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { networks, regionName } from "@/lib/data/networks";
import type { NetworkId } from "@/lib/data/networks";

/**
 * The names of the networks without a region, which are not a whole
 * country: the London Underground is not "United Kingdom".
 */
const ownNames: Partial<Record<NetworkId, () => string>> = {
    lu: m["networks.lu"],
};

/**
 * The network's name in the page's language, as the network pill shows it:
 * its country's name ("Nederland", "Netherlands"), so a country's network
 * needs no message, or its own ("London Underground")
 * (docs/network-picker.md#the-picker).
 */
export function networkName(network: NetworkId): string {
    const own = ownNames[network];
    if (own != null) {
        return own();
    }
    const { region } = networks[network];
    return region == null ? network.toUpperCase() : regionName(region, getLocale());
}
