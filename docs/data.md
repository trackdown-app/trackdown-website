# Game data

The stations, puzzles and trips come from the private `trackdown-app/trackdown-data` repository. `src/lib/data/` reads them on the server, checks every file against a zod schema and keeps what it read in memory. How the files get into the build is in [deploy.md](deploy.md#the-game-data).

## Files

Each network has a folder of its own in trackdown-data's `data/`:

| File | Schema (`src/lib/data/data-schema.ts`) | What it holds |
| --- | --- | --- |
| `stations.json` | `stationsFileSchema` | Every station a player can guess: `code`, `name`, `province`, `lat`, `lon`. Codes are lower-case letters and digits and appear once. |
| `puzzles.json` | `puzzlesFileSchema` | The daily schedule: `n`, `date` (`YYYY-MM-DD`), `station`. No number or date appears twice. |
| `meta.json` | `metaFileSchema` | The feed, its service dates, the build parameters and when it was built. |
| `to/<code>.json` | `tripsFileSchema` | The fastest trip to `<code>` from every other station, by origin code. Only the mystery stations, the ones a puzzle can be, have one: in `nl` all 395, in `gb` 455 of about 2,550. |

`gb` also has `operators.json` (the operator codes' names) and `LICENSE.md`: its data is CC BY-SA 4.0, built from Network Rail's timetable, and the licence stays with the files. The site reads neither; the attribution is on the About page ([about-privacy-terms.md](about-privacy-terms.md)).

| Network | Stations | Codes | `province` holds |
| --- | --- | --- | --- |
| `nl` | 395 | NS codes (`ut`, `amf`) | the province, in Dutch |
| `gb` | 2,549 | CRS codes, lower case (`kgx`, `edb`) | the ITL1 region (London, Scotland, Wales…), in English |

A trip is stored as `[string, minutes]` entries that alternate between a ride and a change, starting and ending with a ride: `[["IC", 116], ["ut", 10], ["IC", 13]]`. `tripSchema` parses it into `TripStep`s, so code reading a trip never counts entries:

```ts
[
    { kind: "ride", train: "IC", minutes: 116 },
    { kind: "change", station: "ut", minutes: 10 },
    { kind: "ride", train: "IC", minutes: 13 },
];
```

A ride's label (`trainTypeSchema`) is the train type in `nl` (`IC`, `ICD`, `SPR`, `ST`, `SNT`, `ICE`, `EC`) and the train operator's two-letter code in `gb` (`GW`, `SR`, `XC`…, named in trackdown-data's `gb/operators.json`). The two lists do not overlap, so one enum holds both; a new label in the data fails the check until it is added there. A change's station may be one outside the network's `stations.json` (Aachen, Antwerpen), so it is only checked to be a code.

The schemas hold no data, so `data-schema.ts` may be imported anywhere, the browser included.

## Networks

`src/lib/data/networks.ts` lists the networks: `networkIdSchema` (a zod enum: `nl`, `gb`) and `networks`, which gives each its folder in `data/` and its country (`region`, which names it). Adding a network adds its id to the enum and its entry to `networks`; TypeScript refuses the one without the other. The same file holds `defaultNetwork` and `upcomingNetworks`, the countries the network picker lists as coming later; a new network leaves that list ([network-picker.md](network-picker.md#adding-a-network)).

## The loader

`gameData` (`src/lib/data/trackdown-data.ts`) is what server code reads:

```ts
const stations = await gameData.stations("nl");
const puzzles = await gameData.puzzles("nl");
const meta = await gameData.meta("nl");
const trips = await gameData.tripsTo("nl", puzzle.station);
```

- **Server-only.** `trackdown-data.ts`, `game-data.ts`, `read-data-dir.ts` and `check-data.ts` import `@tanstack/react-start/server-only`, so importing any of them from code that reaches the browser fails the build ("Import denied in client environment"). Call them from a server function's handler ([data-loading.md](data-loading.md#the-pieces)).
- **Where it reads.** `gameData` reads through Nitro's `assets:trackdown-data` storage, the data directory `vite.config.ts` mounts from `TRACKDOWN_DATA_DIR` ([deploy.md](deploy.md#the-game-data)). In development that is the folder on disk; in a build each file is a lazy import inside the server function. Without `TRACKDOWN_DATA_DIR` every read fails with "is missing from the data directory".
- **Lazy, then cached.** Nothing is read when the server starts. Each file is read and checked on its first use and kept in memory for as long as the process lives: on Vercel, a warm function instance. `tripsTo` reads only `to/<code>.json` for the station asked for, so a puzzle costs one trips file (about 25 KB in `nl`, 220 KB in `gb`) on top of `stations.json`. Concurrent first calls share one read. A read that fails is not cached and is tried again on the next call.
- **Errors.** A missing file or one that does not match its schema throws a `GameDataError` that names the file and, for a schema error, every issue zod found. `tripsTo` with a code that is not in `stations.json` throws one before any file is read, so a code from a request never becomes a path of its own.

`createGameData(read)` (`src/lib/data/game-data.ts`) builds a loader over any `DataReader`, a function from a path inside the data directory (`nl/to/ut.json`) to its parsed JSON, or `null` when the file is missing. `gameData` is the one over Nitro's storage; `readDataDir(dir)` (`read-data-dir.ts`) reads a folder on disk, for the tests and `data:check`.

## The fixture

`fixtures/trackdown-data/nl/` is a made-up network of five stations (Alfastad Centraal, Bravodorp, Charlieveen, Deltahaven, Echoburg) in the real files' format, with a trips file for every station. `fixtures/trackdown-data/gb/` is a made-up network of four (Foxtrot Abbey, Golf Lane, Hotel Junction, India Road) where only two have a trips file, as in the real `gb`, and rides are labelled by operator. Every network in `networkIdSchema` needs a fixture folder: a unit test runs `checkNetwork` on each. They hold no real data, so it is committed. The unit tests (`src/lib/data/*.test.ts`) run on it only, never on the real data, so CI needs no access to trackdown-data. A test that needs a broken file builds it in the test, over a `DataReader` of its own.

Pointing `TRACKDOWN_DATA_DIR` at `fixtures/trackdown-data` builds or runs the site with the fixture.

## Checking the data

`bun run data:check [dir]` reads every file of every network in `dir` (default `TRACKDOWN_DATA_DIR`, which Bun reads from `.env.local`) through the same loader, and also checks what the schemas cannot see on their own: every puzzle's station is a station, `meta.json` counts the stations `stations.json` has, every puzzle's station has a trips file, `meta.json`'s `mysteryStations` counts the trips files there are, and every trips file has a trip from every other station. A station without a trips file is fine unless a puzzle is that station (`MissingDataFileError` tells a missing file from a broken one). It prints what is wrong and exits with 1, or prints the counts:

```text
nl: 395 stations, 1095 puzzles, all valid
gb: 2549 stations, 1095 puzzles, all valid
```

The deploy workflow runs it on its trackdown-data checkout before it builds, so data that does not match never reaches a deploy ([deploy.md](deploy.md#the-deploy-workflow)). A unit test runs the same checks on the fixture.

## The build guard

The data may be bundled into the server function and read there, never copied to the static output that Vercel's CDN serves. Two things keep it there:

- **At build time.** The loader's modules are server-only (see [The loader](#the-loader)), so importing `gameData` from a component fails `vite build` with "Import denied in client environment".
- **After the build.** `bun run build:guard [dir]` (`scripts/check-build-output.ts`) reads every file of the data directory `dir` (default `TRACKDOWN_DATA_DIR`) and every file of the static output that exists, `.vercel/output/static` after `vercel build` and `.output/public` after `bun run build`. It fails, listing each find, when a static file:
  - has a data file's bytes, under any name (a data file put in `public/`);
  - has a data file's name (`stations.json`, `to/alf.json`);
  - or, for a text file (scripts, stylesheets, HTML, JSON, source maps), holds a data file's whole contents, one of its puzzles or stations, a trip keyed by its origin's code (`brv:[["IC",20]]`, how a `to/` file reads once a bundler inlines a JSON import) or a trip with a change on its own. A trip without a change (`[["IC",20]]`) is too short to tell apart from code, so it only counts with its code in front.

  The text is compared with whitespace, quotes and backslashes removed, so JSON, a JS object literal and an escaped `JSON.parse('…')` string all match. The comparison lives in `findDataLeaks` (`src/lib/data/find-data-leaks.ts`), tested on the fixture.

```text
.vercel/output/static: 45 files, none holds any of 8 data files
```

CI's Build check builds with the fixture as `TRACKDOWN_DATA_DIR` and runs the guard on it ([getting-started.md](getting-started.md#continuous-integration)); the deploy workflow runs it on the real data after `vercel build`, before it uploads anything ([deploy.md](deploy.md#the-deploy-workflow)).

Local copies of the data stay out of Git: `.gitignore` ignores `.env*`, the deploy workflow's `.trackdown-data/`, and a `data/` or `TrackdownData/` folder at the repository's root.
