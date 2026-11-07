import { createServerFn } from "@tanstack/react-start";
import { getPuzzleArchive } from "@/lib/game/puzzle-archive";
import { puzzleArchiveInputSchema } from "@/lib/game/schemas";
import { serviceContext } from "@/lib/game/service-context";

/**
 * The `puzzleArchive` operation for the web; `GET /api/v1/{network}/puzzles`
 * is the same for iOS.
 */
export const getPuzzleArchiveFn = createServerFn({ method: "GET" })
    .validator(puzzleArchiveInputSchema)
    .handler(({ data }) => getPuzzleArchive(data, serviceContext));
