import { z } from "zod";
import {
    metaFileSchema,
    stationCodeSchema,
    trainTypeSchema,
} from "@/lib/data/data-schema";
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

/**
 * `guess`: one guess at a puzzle, with the guesses before it. The network and
 * the puzzle's number come from the path; the REST route reads the number as
 * a string, so it is coerced. Which stations exist, repeats and the number of
 * guesses are the service's to check: they need the data or the rules.
 */
export const guessInputSchema = z.object({
    network: networkIdSchema,
    number: z.coerce.number().int().positive(),
    /** The station guessed now. */
    guess: stationCodeSchema,
    /** The player's earlier guesses at this puzzle, oldest first. */
    earlierGuesses: z.array(stationCodeSchema).default([]),
});

export type GuessInput = z.output<typeof guessInputSchema>;

/** `guess`: one ride of the trip from the guess to the mystery station. */
export const guessRideSchema = z.strictObject({
    kind: z.literal("ride"),
    train: trainTypeSchema,
    minutes: z.number().int().nonnegative(),
});

/**
 * `guess`: one change of the trip. `station` is the station's code only when
 * the player guessed it earlier, else `null`: a hidden `?`, so a trip never
 * names a station the player has not named first.
 */
export const guessChangeSchema = z.strictObject({
    kind: z.literal("change"),
    station: stationCodeSchema.nullable(),
    minutes: z.number().int().nonnegative(),
});

/**
 * `guess`: how far the guess is from the mystery station. Never the mystery
 * station itself: strict, so a field this schema does not name fails the
 * test of its service. A correct guess has no trip (`steps` is empty and
 * `totalMinutes` 0); the whole trip list is the reveal's.
 */
export const guessOutputSchema = z.strictObject({
    network: networkIdSchema,
    number: z.number().int().positive(),
    guess: stationCodeSchema,
    correct: z.boolean(),
    /** The trip's rides and changes, from the guess to the mystery station. */
    steps: z.array(
        z.discriminatedUnion("kind", [guessRideSchema, guessChangeSchema]),
    ),
    /** Every ride and change together, in minutes. */
    totalMinutes: z.number().int().nonnegative(),
});

export type GuessOutput = z.output<typeof guessOutputSchema>;

/**
 * `reveal`: a finished game at a puzzle. The network and the puzzle's number
 * come from the path, the number coerced like the guess's. Whether the game
 * is over is the service's to check: it needs the answer.
 */
export const revealInputSchema = z.object({
    network: networkIdSchema,
    number: z.coerce.number().int().positive(),
    /** Every guess the player made at this puzzle, oldest first. */
    guesses: z.array(stationCodeSchema),
});

export type RevealInput = z.output<typeof revealInputSchema>;

/** `reveal`: one change of a guess's trip, its station always named. */
export const revealedChangeSchema = z.strictObject({
    kind: z.literal("change"),
    station: stationCodeSchema,
    minutes: z.number().int().nonnegative(),
});

/**
 * `reveal`: one guess of the game with its whole trip. A correct guess has
 * no trip (`steps` is empty and `totalMinutes` 0), as in the guess's answer.
 */
export const revealedGuessSchema = z.strictObject({
    guess: stationCodeSchema,
    correct: z.boolean(),
    steps: z.array(
        z.discriminatedUnion("kind", [guessRideSchema, revealedChangeSchema]),
    ),
    totalMinutes: z.number().int().nonnegative(),
});

export type RevealedGuess = z.output<typeof revealedGuessSchema>;

/**
 * `reveal`: the mystery station and every guess's trip, every change named.
 * Only answered once the game is over.
 */
export const revealOutputSchema = z.strictObject({
    network: networkIdSchema,
    number: z.number().int().positive(),
    /** The mystery station's code. */
    station: stationCodeSchema,
    /** Whether the last guess was the mystery station. */
    solved: z.boolean(),
    /** The input's guesses, in its order. */
    guesses: z.array(revealedGuessSchema),
});

export type RevealOutput = z.output<typeof revealOutputSchema>;

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
