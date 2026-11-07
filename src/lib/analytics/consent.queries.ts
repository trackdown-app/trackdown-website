import { queryOptions } from "@tanstack/react-query";
import { getConsentFn } from "@/lib/analytics/consent.functions";

export function consentQueryOptions() {
    return queryOptions({
        queryKey: ["analytics", "consent"],
        queryFn: () => getConsentFn(),
        // Choosing reloads the document; each SSR request has its own cache.
        staleTime: Infinity,
    });
}
