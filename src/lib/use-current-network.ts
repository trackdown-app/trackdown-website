import { useParams, useRouteContext } from "@tanstack/react-router";
import { defaultNetwork, networkIdSchema } from "@/lib/data/networks";
import type { NetworkId } from "@/lib/data/networks";

/**
 * The network the shell shows (docs/network-picker.md): the page's own on a
 * network's page (`/{network}/…`), else the one this visitor chose last,
 * else the default one.
 */
export function useCurrentNetwork(): NetworkId {
    const params = useParams({ strict: false });
    const chosen = useRouteContext({
        from: "__root__",
        select: (context) => context.chosenNetwork,
    });
    const fromPage = networkIdSchema.safeParse(params["network"]);
    if (fromPage.success) {
        return fromPage.data;
    }
    // A router without the site's root (a component test) has no choice.
    const fromChoice = networkIdSchema.safeParse(chosen);
    return fromChoice.success ? fromChoice.data : defaultNetwork;
}
