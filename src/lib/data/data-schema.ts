import { z } from "@/lib/zod";

// The files of one network's data folder (docs/data.md#files). The schemas
// hold no data, so this module may be imported anywhere; only the loader
// that reads the files is server-only.

/** A station's NS code, such as `ut` or `amf`: lower-case letters and digits. */
export const stationCodeSchema = z
    .string()
    .regex(/^[a-z0-9]+$/, "a station code is lower-case letters and digits");

export type StationCode = z.infer<typeof stationCodeSchema>;

const minutesSchema = z.number().int().nonnegative();

export const stationSchema = z.object({
    code: stationCodeSchema,
    name: z.string().min(1),
    province: z.string().min(1),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
});

export type Station = z.infer<typeof stationSchema>;

/** `stations.json`: every station a player can guess, sorted by name. */
export const stationsFileSchema = z
    .array(stationSchema)
    .min(1)
    .superRefine((stations, ctx) => {
        const seen = new Set<string>();
        stations.forEach((station, index) => {
            if (seen.has(station.code)) {
                ctx.addIssue({
                    code: "custom",
                    message: `station code "${station.code}" appears twice`,
                    path: [index, "code"],
                });
            }
            seen.add(station.code);
        });
    });

export const puzzleSchema = z.object({
    /** The puzzle's number; puzzle 1 is the first day. */
    n: z.number().int().positive(),
    date: z.iso.date(),
    /** The mystery station. */
    station: stationCodeSchema,
});

export type Puzzle = z.infer<typeof puzzleSchema>;

/** `puzzles.json`: the daily schedule, one puzzle per date. */
export const puzzlesFileSchema = z
    .array(puzzleSchema)
    .min(1)
    .superRefine((puzzles, ctx) => {
        const numbers = new Set<number>();
        const dates = new Set<string>();
        puzzles.forEach((puzzle, index) => {
            if (numbers.has(puzzle.n)) {
                ctx.addIssue({
                    code: "custom",
                    message: `puzzle ${puzzle.n} appears twice`,
                    path: [index, "n"],
                });
            }
            if (dates.has(puzzle.date)) {
                ctx.addIssue({
                    code: "custom",
                    message: `date ${puzzle.date} has two puzzles`,
                    path: [index, "date"],
                });
            }
            numbers.add(puzzle.n);
            dates.add(puzzle.date);
        });
    });

/** A GTFS service date, `YYYYMMDD`. */
const serviceDateSchema = z.string().regex(/^\d{8}$/, "a date is YYYYMMDD");

/** `meta.json`: where the data comes from and how it was built. */
export const metaFileSchema = z.object({
    source: z.string().min(1),
    feed: z.string().min(1),
    serviceDates: z.array(serviceDateSchema).min(1),
    /** First and last departure the trips start from, in minutes after midnight. */
    departureWindow: z.tuple([minutesSchema, minutesSchema]),
    minChangeMinutes: minutesSchema,
    changePenaltyMinutes: minutesSchema,
    stations: z.number().int().positive(),
    mysteryStations: z.number().int().positive(),
    builtAt: z.iso.datetime(),
});

export type Meta = z.infer<typeof metaFileSchema>;

/** The train types a ride can be (trackdown-data README, "Trip format"). */
export const trainTypeSchema = z.enum([
    "IC",
    "ICD",
    "SPR",
    "ST",
    "SNT",
    "ICE",
    "EC",
]);

export type TrainType = z.infer<typeof trainTypeSchema>;

export type Ride = { kind: "ride"; train: TrainType; minutes: number };

/** Waiting at `station` for the next train. */
export type Change = { kind: "change"; station: StationCode; minutes: number };

export type TripStep = Ride | Change;

/**
 * One trip as stored: `[string, minutes]` entries that alternate between a
 * ride (the train type) and a change (the station code), starting and ending
 * with a ride. Parsed into `TripStep`s, so code reading a trip never has to
 * know which entry is which.
 */
export const tripSchema = z
    .array(z.tuple([z.string(), minutesSchema]))
    .min(1)
    .transform((entries, ctx): TripStep[] => {
        if (entries.length % 2 === 0) {
            ctx.issues.push({
                code: "custom",
                message:
                    "a trip starts and ends with a ride, so it has an odd number of entries",
                input: entries,
            });
            return z.NEVER;
        }
        const steps: TripStep[] = [];
        entries.forEach(([value, minutes], index) => {
            if (index % 2 === 0) {
                const train = trainTypeSchema.safeParse(value);
                if (train.success) {
                    steps.push({ kind: "ride", train: train.data, minutes });
                } else {
                    ctx.issues.push({
                        code: "custom",
                        message: `entry ${index} is a ride, but "${value}" is not a train type`,
                        input: value,
                        path: [index, 0],
                    });
                }
            } else {
                const station = stationCodeSchema.safeParse(value);
                if (station.success) {
                    steps.push({ kind: "change", station: station.data, minutes });
                } else {
                    ctx.issues.push({
                        code: "custom",
                        message: `entry ${index} is a change, but "${value}" is not a station code`,
                        input: value,
                        path: [index, 0],
                    });
                }
            }
        });
        return steps;
    });

/** `to/<code>.json`: the fastest trip to `<code>` from every other station, by origin. */
export const tripsFileSchema = z.record(stationCodeSchema, tripSchema);

export type TripsTo = z.infer<typeof tripsFileSchema>;
