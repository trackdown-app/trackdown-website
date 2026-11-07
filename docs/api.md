# API

The website and the iOS app must get the same answers from the same code. Every operation is one service function, reached two ways: a server function and TanStack Query for the web, and a REST route under `/api/v1` for iOS. Both check their input against the same zod schema and call the same service, so neither can answer differently.

```text
web:  route loader ── metaQueryOptions ── getMetaFn ─┐
                                                     ├── getMeta(input, serviceContext)
iOS:  GET /api/v1/meta ── metaHandlers.GET ──────────┘
```

## Operations

| Operation | Service | Web | REST | Input | Output |
| --- | --- | --- | --- | --- | --- |
| `meta` | `getMeta` (`src/lib/game/meta.ts`) | `getMetaFn`, `metaQueryOptions(network)` | `GET /api/v1/meta` | `metaInputSchema`: `network` (query string), default `nl` | `metaOutputSchema`: the network's `meta.json`, with `network` and `dataRef` |
| `todayPuzzle` | `getTodayPuzzle` (`src/lib/game/today-puzzle.ts`) | `getTodayPuzzleFn`, `todayPuzzleQueryOptions(network)` | `GET /api/v1/{network}/puzzles/today` | `todayPuzzleInputSchema`: `network` (path), required | `todayPuzzleOutputSchema`: `network`, `number`, `date`, `maxGuesses`, `nextPuzzleAt`; never the station |
| `stations` | `getStations` (`src/lib/game/stations.ts`) | `getStationsFn`, `stationsQueryOptions(network, locale)` | `GET /api/v1/{network}/stations` | `stationsInputSchema`: `network` (path), required; `locale` (query string), `nl` or `en`, default `nl` | `stationsOutputSchema`: `network`, `locale`, `stations` (`code`, `name`, `province`); no coordinates, no trips |

`dataRef` is the trackdown-data commit the build was made from, or `local` ([deploy.md](deploy.md#the-game-data)).

```text
GET /api/v1/meta?network=nl

200 {"source":"…","feed":"…","serviceDates":["20261203"],"departureWindow":[540,600],
     "minChangeMinutes":3,"changePenaltyMinutes":5,"stations":395,"mysteryStations":395,
     "builtAt":"2026-11-07T12:00:00.000Z","network":"nl","dataRef":"3f2a…"}
```

### Today's puzzle

Which puzzle is today's, without its answer, so the web and iOS show the same puzzle number and count down to the same moment.

```text
GET /api/v1/nl/puzzles/today

200 {"network":"nl","number":142,"date":"2026-11-06","maxGuesses":6,
     "nextPuzzleAt":"2026-11-06T23:00:00.000Z"}
```

- **The day** runs from midnight to midnight in Europe/Amsterdam (`puzzleTimeZone`, `src/lib/game/rules.ts`), for every player wherever they are. `src/lib/game/puzzle-day.ts` turns the service context's `now()` into that date and finds the instant the next date starts. The day the clocks change is 23 or 25 hours long, so `nextPuzzleAt` is `22:00Z` in summer time and `23:00Z` in winter time.
- **The puzzle** is the entry of `puzzles.json` with that date. A day without one (before puzzle 1, past the end of the schedule) answers `not_found`.
- **The answer** is never in it: the service builds the answer field by field, and `todayPuzzleOutputSchema` is strict, so its test fails on any field it does not name, `station` included.
- **`maxGuesses`** is the game's `maxGuesses` (`rules.ts`), 6.
- **`todayPuzzleQueryOptions`** keeps the answer fresh until `nextPuzzleAt`.

### Stations

Every station a player can guess, for the guess search: 395 for `nl`.

```text
GET /api/v1/nl/stations?locale=en

200 {"network":"nl","locale":"en","stations":[
     {"code":"ht","name":"'s-Hertogenbosch","province":"North Brabant"},
     {"code":"hto","name":"'s-Hertogenbosch Oost","province":"North Brabant"},…]}
```

- **The stations** are the network's `stations.json`, in its order (by name), and nothing else. A station that only appears as a change in a trip (Aachen, Antwerpen) is not guessable and not in it.
- **No trip data, no coordinates**: the service builds each station field by field, and `stationsOutputSchema` and its stations are strict, so its test fails on any field they do not name.
- **The province** is named in `locale`. `stations.json` names it in Dutch; `provinceName` (`src/lib/game/province-names.ts`) gives the English name where it differs (Noord-Holland is North Holland, Fryslân is Friesland). A province without an entry keeps its data name, so a new one shows in Dutch until it is added there.
- **Cached for long** ([Caching](#caching)): the answer only changes with a deploy. `stationsQueryOptions` keeps it fresh for as long as the page is open.

## The pieces

- **Schemas** (`src/lib/game/schemas.ts`): the input and output schema of every operation, in one place. They hold no data and no server code, so the browser may import them, and they are the contract the iOS app follows.
- **Services** (`src/lib/game/<operation>.ts`, server-only): one function per operation, `(input, context) => Promise<output>`. The input is already checked. Everything else it reads comes from the `ServiceContext` it is given (`src/lib/game/service-context.ts`): the game data, the data's commit and the current time (`now()`). The server function and the REST route pass `serviceContext`, which reads the real data; a test passes the fixture. A service throws an `ApiError` for an answer that is the caller's fault (a puzzle that does not exist yet); any other error is a server error.
- **Server functions** (`src/lib/game/<operation>.functions.ts`) and **query options** (`<operation>.queries.ts`): the web's side, as in [data-loading.md](data-loading.md#the-pieces). The validator is the operation's input schema, the handler calls the service with `serviceContext`.
- **REST handlers** (`src/lib/api/v1-handlers.ts`, server-only): the iOS side. `restGet(inputSchema, run)` (`src/lib/api/rest.ts`) reads the input from the query string and the route's path parameters (a path parameter wins over a query field of the same name), checks it, calls the service and answers JSON. `restGet(inputSchema, run, "deploy")` lets the CDN keep a successful answer ([Caching](#caching)); without it every answer is `Cache-Control: no-store`. `restHandlers` adds an `ANY` handler that answers every other method 405 with `Allow: GET`.
- **REST routes** (`src/routes/api/v1/<operation>.ts`, or a nested path such as `$network/puzzles/today.ts` for `/api/v1/{network}/puzzles/today`): a file route with only `server.handlers`, the operation's handlers from `v1-handlers.ts`. `src/routes/api/v1/$.ts` answers every other path under `/api/v1` 404 in the error format, not with the site's not-found page.

## Errors

Every error a REST route answers has one shape (`apiErrorBodySchema`, `src/lib/api/api-error.ts`) and the status that belongs to its code:

```json
{ "error": { "code": "invalid_input", "message": "✖ Invalid input: expected \"nl\"\n  → at network" } }
```

| Code | Status | When |
| --- | --- | --- |
| `invalid_input` | 400 | The input does not match the operation's schema; the message lists zod's issues. |
| `not_found` | 404 | No operation at that path, or a service's `ApiError` for something that does not exist. |
| `method_not_allowed` | 405 | A method other than the operation's (`Allow` names it). |
| `internal_error` | 500 | Any error that is not an `ApiError`. It is logged to the server's console; the answer carries a generic message, never the error's own (a file path, a schema issue). |

The message is for a developer, not for a player: the app shows its own text per code.

A server function's error reaches the web's query as a thrown error, which the route's error page shows ([site-shell.md](site-shell.md)).

## Caching

A REST answer says how long it may be kept (`RestCache`, `src/lib/api/rest.ts`):

| Cache | Headers | For |
| --- | --- | --- |
| `none` (default) | `Cache-Control: no-store` | Every error, and every answer that changes between deploys (`meta`, `todayPuzzle`). |
| `deploy` | `Cache-Control: public, max-age=86400`, `Vercel-CDN-Cache-Control: public, max-age=31536000` | An answer that only changes with a deploy (`stations`). |

`Vercel-CDN-Cache-Control` is read by Vercel's CDN only and not passed on: the CDN keeps the answer for a year, per URL (so per `locale`), and its cache belongs to one deployment, so a new deploy answers afresh. A client (the iOS app, a browser) keeps it for a day. An error is never kept, whatever the operation's cache.

## Versioning

Every REST route lives under `/api/v1`. A change the iOS app already in the App Store would break on (a field removed or renamed, a meaning changed) goes under `/api/v2` beside v1, until v1's last app version is gone. A new field or a new operation is not a break and stays in v1. Server functions are not versioned: the web and its server ship together.

The router's locale rewrite also matches `/en/api/v1/…` ([i18n.md](i18n.md#locale-routing)); the app always calls the path without a prefix.

## Adding an operation

1. Add its input and output schema to `src/lib/game/schemas.ts`.
2. Write the service in `src/lib/game/<operation>.ts`, server-only, taking `(input, context: ServiceContext)`, with a test on the fixture beside it.
3. Add the server function to `<operation>.functions.ts` and its factory to `<operation>.queries.ts` ([data-loading.md](data-loading.md#adding-a-read)).
4. Add its handlers to `src/lib/api/v1-handlers.ts` and a route file `src/routes/api/v1/<operation>.ts` that hands them to Start, and test the handlers in `v1-handlers.test.ts`.
5. Add a row to the table in [Operations](#operations).

## Tests

`src/lib/game/meta.test.ts` runs the service and its schemas on the fixture. `src/lib/game/today-puzzle.test.ts` runs `getTodayPuzzle` at fixed instants on the fixture with its schedule carried on for 400 days: puzzle 142 on 6 November 2026, the switch at Amsterdam midnight in winter and summer, both clock changes, no station in the answer and a day without a puzzle. `src/lib/game/stations.test.ts` runs `getStations` on the fixture: every station with its code, name and province, nothing its strict schema does not name, no station that is only a change in a trip, the English province names and the input's defaults. `src/lib/api/v1-handlers.test.ts` calls the REST handlers with a `Request` and path parameters, as Start does, with `serviceContext` mocked to read the fixture at a fixed time: the answer, a bad input, a server error that keeps its message to itself, a day without a puzzle, the cache headers of a kept answer and of its errors, another method and an unknown path.
