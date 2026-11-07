// Marks this module server-only: it reads the game data.
import "@tanstack/react-start/server-only";
import type { MetaInput, MetaOutput } from "@/lib/game/schemas";
import type { ServiceContext } from "@/lib/game/service-context";

/**
 * Where a network's data comes from and how it was built. The `meta`
 * operation's one service: the server function and `GET /api/v1/meta` both
 * answer with what it returns.
 */
export async function getMeta(
    input: MetaInput,
    context: ServiceContext,
): Promise<MetaOutput> {
    const meta = await context.data.meta(input.network);
    return { ...meta, network: input.network, dataRef: context.dataRef };
}
