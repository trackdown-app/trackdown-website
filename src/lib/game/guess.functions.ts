import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { guardGameRequest } from "@/lib/api/request-guard";
import { submitGuess } from "@/lib/game/guess";
import { guessInputSchema } from "@/lib/game/schemas";
import { serviceContext } from "@/lib/game/service-context";

/**
 * The `guess` operation for the web; `POST /api/v1/{network}/puzzles/{n}/guesses`
 * is the same for iOS. A `POST`, so a component calls it through a
 * `useMutation` (docs/data-loading.md). It shares the REST route's rate limit
 * per IP (docs/api.md#rate-limit).
 */
export const submitGuessFn = createServerFn({ method: "POST" })
    .validator(guessInputSchema)
    .handler(({ data }) => {
        guardGameRequest(getRequest());
        return submitGuess(data, serviceContext);
    });
