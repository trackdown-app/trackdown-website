import { createServerFn } from "@tanstack/react-start";
import { revealAnswer } from "@/lib/game/reveal";
import { revealInputSchema } from "@/lib/game/schemas";
import { serviceContext } from "@/lib/game/service-context";

/**
 * The `reveal` operation for the web; `POST /api/v1/{network}/puzzles/{n}/reveal`
 * is the same for iOS. A `POST`, so a component calls it through a
 * `useMutation` (docs/data-loading.md).
 */
export const revealAnswerFn = createServerFn({ method: "POST" })
    .validator(revealInputSchema)
    .handler(({ data }) => revealAnswer(data, serviceContext));
