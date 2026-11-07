import { z } from "zod";
import { metaFileSchema } from "@/lib/data/data-schema";
import { networkIdSchema } from "@/lib/data/networks";

// The input and output of every API operation, in one place
// (docs/api.md#schemas). The server function and the REST route check their
// input against the same schema. Holds no data, so it may be imported
// anywhere, the browser included.

/** `meta`: which network to describe. Without one, `nl`. */
export const metaInputSchema = z.object({
    network: networkIdSchema.default("nl"),
});

export type MetaInput = z.output<typeof metaInputSchema>;

/** `meta`: the network's `meta.json`, which network it is and the data's commit. */
export const metaOutputSchema = metaFileSchema.extend({
    network: networkIdSchema,
    /** The trackdown-data commit the build was made from, or `local`. */
    dataRef: z.string().min(1),
});

export type MetaOutput = z.output<typeof metaOutputSchema>;

/** `todayPuzzle`: which network's puzzle. From the path, so no default. */
export const todayPuzzleInputSchema = z.object({
    network: networkIdSchema,
});

export type TodayPuzzleInput = z.output<typeof todayPuzzleInputSchema>;

/**
 * `todayPuzzle`: which puzzle is today's, and when the next one starts. Never
 * the mystery station: strict, so a field this schema does not name fails
 * the test of its service.
 */
export const todayPuzzleOutputSchema = z.strictObject({
    network: networkIdSchema,
    /** The puzzle's number; puzzle 1 is the first day. */
    number: z.number().int().positive(),
    /** The puzzle's day, `YYYY-MM-DD`, in Europe/Amsterdam. */
    date: z.iso.date(),
    /** How many guesses a player has. */
    maxGuesses: z.number().int().positive(),
    /** When the next puzzle starts: the next midnight in Europe/Amsterdam. */
    nextPuzzleAt: z.iso.datetime(),
});

export type TodayPuzzleOutput = z.output<typeof todayPuzzleOutputSchema>;
