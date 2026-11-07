import { createFileRoute, notFound } from "@tanstack/react-router";
import { networkIdSchema } from "@/lib/data/networks";

/**
 * Every page of one network: its game at `/{network}` and its archive at
 * `/{network}/archief` (docs/network-picker.md#routes). A network the game
 * has no data for is not found. The pages below read the checked id from
 * the route's context as `network`.
 */
export const Route = createFileRoute("/$network")({
    beforeLoad: ({ params }) => {
        const parsed = networkIdSchema.safeParse(params.network);
        if (!parsed.success) {
            throw notFound();
        }
        return { network: parsed.data };
    },
});
