import { z } from "zod";
import { metaFileSchema, stationCodeSchema } from "@/lib/data/data-schema";
import { networkIdSchema } from "@/lib/data/networks";
import { baseLocale, locales } from "@/paraglide/runtime";

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

/** A site locale: `nl` or `en`. Without one, the base locale, `nl`. */
export const localeSchema = z.enum(locales).default(baseLocale);

/**
 * `stations`: which network's stations, from the path, and in which locale
 * to name their provinces (query string), by default `nl`.
 */
export const stationsInputSchema = z.object({
    network: networkIdSchema,
    locale: localeSchema,
});

export type StationsInput = z.output<typeof stationsInputSchema>;

/**
 * `stations`: one station a player can guess. Strict, so a field this schema
 * does not name (its coordinates, a trip) fails the test of its service.
 */
export const guessableStationSchema = z.strictObject({
    code: stationCodeSchema,
    name: z.string().min(1),
    /** The station's province, named in the input's locale. */
    province: z.string().min(1),
});

export type GuessableStation = z.output<typeof guessableStationSchema>;

/** `stations`: every station a player can guess, sorted by name. */
export const stationsOutputSchema = z.strictObject({
    network: networkIdSchema,
    locale: z.enum(locales),
    stations: z.array(guessableStationSchema),
});

export type StationsOutput = z.output<typeof stationsOutputSchema>;
