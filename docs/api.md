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
| `puzzleArchive` | `getPuzzleArchive` (`src/lib/game/puzzle-archive.ts`) | `getPuzzleArchiveFn`, `puzzleArchiveQueryOptions(network)` | `GET /api/v1/{network}/puzzles` | `puzzleArchiveInputSchema`: `network` (path), required | `puzzleArchiveOutputSchema`: `network`, `puzzles` (`number`, `date`), oldest first, up to today's; never a station |
| `guess` | `submitGuess` (`src/lib/game/guess.ts`) | `submitGuessFn` (`POST`, through a `useMutation`) | `POST /api/v1/{network}/puzzles/{n}/guesses` | `guessInputSchema`: `network`, `number` (path), `guess`, `earlierGuesses` (JSON body; default `[]`) | `guessOutputSchema`: `network`, `number`, `guess`, `correct`, `steps`, `totalMinutes`; never the station |
| `reveal` | `revealAnswer` (`src/lib/game/reveal.ts`) | `revealAnswerFn` (`POST`, through a `useMutation`) | `POST /api/v1/{network}/puzzles/{n}/reveal` | `revealInputSchema`: `network`, `number` (path), `guesses` (JSON body), required | `revealOutputSchema`: `network`, `number`, `station`, `solved`, `guesses` (`guess`, `correct`, `steps`, `totalMinutes`); only once the game is over |
| `stations` | `getStations` (`src/lib/game/stations.ts`) | `getStationsFn`, `stationsQueryOptions(network, locale)` | `GET /api/v1/{network}/stations` | `stationsInputSchema`: `network` (path), required; `locale` (query string), `nl` or `en`, default `nl` | `stationsOutputSchema`: `network`, `locale`, `stations` (`code`, `name`, `province`); no coordinates, no trips |

The iOS app generates its client from the OpenAPI document: [`openapi/v1.json`](../openapi/v1.json), also served at `GET /api/v1/openapi.json` ([The OpenAPI document](#the-openapi-document)).

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
- **Kept until the next puzzle** ([Caching](#caching)): the CDN and a client keep the REST answer for the seconds left until `nextPuzzleAt`, so it is never served past Amsterdam midnight.

### The archive

Every puzzle a player can still play, so they can replay the days they missed.

```text
GET /api/v1/nl/puzzles

200 {"network":"nl","puzzles":[{"number":1,"date":"2026-06-18"},
     {"number":2,"date":"2026-06-19"},…,{"number":142,"date":"2026-11-06"}]}
```

- **The list** is every entry of `puzzles.json` whose date is today's or earlier, by the same Amsterdam day as [Today's puzzle](#todays-puzzle), sorted by number: oldest first, today's last. A puzzle after today's is never in it, so the schedule's future stays hidden. Before puzzle 1 the list is empty; once the schedule has ended it is the whole schedule.
- **No answers**: the service builds each puzzle field by field (`number`, `date`), and `puzzleArchiveOutputSchema` and its puzzles are strict, so its test fails on any field they do not name, `station` included.
- **Playing one**: [a guess](#a-guess) and [the reveal](#the-reveal) take any puzzle in the list and answer `not_found` for a later one (`playablePuzzle`, `src/lib/game/played-puzzle.ts`).
- **Never kept** (`Cache-Control: no-store`): it grows by one puzzle at every Amsterdam midnight.

### A guess

The game itself: a guess answers the fastest trip from the guessed station to the mystery station. The server keeps no game state; the client sends its earlier guesses with every guess.

```text
POST /api/v1/nl/puzzles/142/guesses
{"guess":"dlt","earlierGuesses":["chr"]}

200 {"network":"nl","number":142,"guess":"dlt","correct":false,
     "steps":[{"kind":"ride","train":"SPR","minutes":12},
              {"kind":"change","station":"chr","minutes":4},
              {"kind":"ride","train":"SPR","minutes":15},
              {"kind":"change","station":null,"minutes":8},
              {"kind":"ride","train":"ICD","minutes":30}],
     "totalMinutes":69,
     "earlierTrips":[{"guess":"chr",
                      "steps":[{"kind":"ride","train":"SPR","minutes":15},
                               {"kind":"change","station":null,"minutes":8},
                               {"kind":"ride","train":"ICD","minutes":30}]}]}
```

- **The trip** is the guess's entry in the mystery station's `to/<code>.json` ([data.md](data.md#files)): rides (`train`, `minutes`) and changes (`minutes`) in order. `totalMinutes` adds up every ride and change.
- **A change's station** is its code only when it is among `earlierGuesses`; otherwise `null`, the design's hidden `?`. A trip never names a station the player has not named first, and never the mystery station.
- **The earlier trips** come back too, in `earlierTrips`: each earlier guess, in the input's order, with its trip again and its changes named by every guess so far, this one included. A change hidden when an earlier guess was answered shows once the player guesses that station, so a client replaces the steps it kept for each earlier guess with these. On a first guess the list is empty. They are the same trips the earlier guesses answered, so they hand a scraper nothing a repeated call would not.
- **A correct guess** answers `correct: true` with no trip (`steps: []`, `totalMinutes: 0`). The whole trip list is [the reveal](#the-reveal), an operation of its own.
- **The puzzle** is any puzzle up to today's ([Today's puzzle](#todays-puzzle)), so an earlier day can still be played. A puzzle after today's answers `not_found`, the same as one that does not exist, so the schedule's future stays hidden.
- **Rejected** with `invalid_input`: a guess or an earlier guess that is not a station of the network, a guess that is among the earlier guesses, earlier guesses that repeat a station, a guess beyond `maxGuesses` (a seventh), and a guess after an earlier one already solved the puzzle. The puzzle is checked first, so a future puzzle answers `not_found` whatever the guesses.
- **The REST route** reads `network` and `number` from the path and the rest from the JSON body (`restPost`, below); a body that is not a JSON object is `invalid_input`. A guess's answer is never kept (`Cache-Control: no-store`).
- **Rate limited** per IP, shared with the reveal and the web's server functions ([Rate limit](#rate-limit)).
- **The checks** it shares with the reveal (the puzzle, the stations, repeats, `maxGuesses`, a guess after the solve) live in `src/lib/game/played-puzzle.ts`, with the trip lookup.

### The reveal

The solved and missed screen: once the game is over, the mystery station and every guess's trip with all its changes named.

```text
POST /api/v1/nl/puzzles/142/reveal
{"guesses":["dlt","ech"]}

200 {"network":"nl","number":142,"station":"ech","solved":true,
     "guesses":[{"guess":"dlt","correct":false,
                 "steps":[{"kind":"ride","train":"SPR","minutes":12},
                          {"kind":"change","station":"chr","minutes":4},…],
                 "totalMinutes":69},
                {"guess":"ech","correct":true,"steps":[],"totalMinutes":0}]}
```

- **The game is over** when its last guess is the mystery station (`solved: true`) or it has `maxGuesses` guesses (6), all wrong (`solved: false`). Before that it answers `game_not_over` (403), whose message names nothing of the puzzle. The server keeps no game state, so the client sends every guess it made, oldest first.
- **The guesses** are checked as a guess's are ([A guess](#a-guess)): a puzzle after today's or one that does not exist is `not_found`, checked first; a station that is not the network's, a repeat, more than `maxGuesses` guesses or a guess after the solve is `invalid_input`.
- **Every trip** is the guess's whole trip from `to/<code>.json`, every change with its station, in the input's order. A correct guess has no trip, as in its guess's answer.
- **`station`** is the mystery station's code; the client names it from [Stations](#stations).
- **Never kept** (`Cache-Control: no-store`), like a guess, and rate limited with it ([Rate limit](#rate-limit)).

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

## The OpenAPI document

An OpenAPI 3.1 document of every route under `/api/v1`, for the iOS app's [Swift OpenAPI Generator](https://github.com/apple/swift-openapi-generator) client. It is generated from the same zod schemas the routes check their input against, so it cannot describe an API the server does not answer.

```text
GET /api/v1/openapi.json

200 {"openapi":"3.1.0","info":{"title":"Trackdown API","version":"1",…},
     "paths":{"/api/v1/meta":{…},"/api/v1/{network}/puzzles/today":{…},…},
     "components":{"schemas":{"GuessResult":{…},"Ride":{…},…},"responses":{…}}}
```

- **Built** by `buildOpenApiDocument` (`src/lib/api/openapi.ts`): its `operations` list names each route's method, path, `operationId`, input and output schema and error codes. A field of the input named in the path (`{network}`, `{number}`) is a path parameter; a `GET`'s other fields are query parameters, a `POST`'s its JSON body (`GuessRequest`, `RevealRequest`). Inputs are described as a client sends them, so a field with a default is optional.
- **Components**: every output schema, and the enums they share (`NetworkId`, `TrainType`, `ApiErrorCode`), is a named component from a zod registry, so the generated client has one Swift type for each. Every error answers the `ApiError` component, through one response per status, whose description names its codes (`BadRequest`, `Unauthorized` for `unknown_client`, `Forbidden` for `game_not_over` and `cross_origin`, `NotFound`, `MethodNotAllowed`, `TooManyRequests` with its `Retry-After` header, `InternalServerError`). Every operation lists its own errors plus `unknown_client`, `cross_origin` and `internal_error`; a guess and the reveal also list `rate_limited`. The document's own route lists no `unknown_client`.
- **The client's headers** are two `apiKey` security schemes, `ClientKey` (`Trackdown-Client-Key`) and `AppVersion` (`Trackdown-App-Version`), required together by the document's top-level `security`; the document's own route has `security: []` ([Client identification](#client-identification)). Swift OpenAPI Generator does not apply security schemes itself, so the app sets both headers in a `ClientMiddleware`.
- **Caching** is in each 200's description: never kept, kept until `nextPuzzleAt` (today's puzzle) or until the next deploy ([Caching](#caching)).
- **Shaped for the generator and for v1 growing** (`tidy`): no `additionalProperties: false`, so an app already in the App Store keeps decoding an answer that gained a field ([Versioning](#versioning)), though the schemas themselves stay strict for the services' tests. A discriminated union (a trip's steps) carries its `discriminator` with a mapping from `kind` to `Ride`, `HiddenChange` or `Change`. A nullable string is `type: ["string", "null"]`, which Swift reads as an optional. `meta`'s `departureWindow` tuple is an array of two integers.
- **Committed** as `openapi/v1.json`, written by `bun run openapi`. `bun run openapi:check` fails when the file is not what the schemas generate; CI runs it as the OpenAPI check ([getting-started.md](getting-started.md#continuous-integration)). Change a schema or an operation, run `bun run openapi`, and commit the file with the change.
- **Served** at `GET /api/v1/openapi.json` (`openApiHandlers`, route `src/routes/api/v1/openapi[.]json.ts`), built once per server start, with the `deploy` cache ([Caching](#caching)).
- **No `servers`**: the app passes its own base URL (production or a preview deploy) to the generated `Client`.

## The pieces

- **Schemas** (`src/lib/game/schemas.ts`): the input and output schema of every operation, in one place. They hold no data and no server code, so the browser may import them, and they are the contract the iOS app follows.
- **Services** (`src/lib/game/<operation>.ts`, server-only): one function per operation, `(input, context) => Promise<output>`. The input is already checked. Everything else it reads comes from the `ServiceContext` it is given (`src/lib/game/service-context.ts`): the game data, the data's commit and the current time (`now()`). The server function and the REST route pass `serviceContext`, which reads the real data; a test passes the fixture. A service throws an `ApiError` for an answer that is the caller's fault (a puzzle that does not exist yet); any other error is a server error.
- **Server functions** (`src/lib/game/<operation>.functions.ts`) and **query options** (`<operation>.queries.ts`): the web's side, as in [data-loading.md](data-loading.md#the-pieces). The validator is the operation's input schema, the handler calls the service with `serviceContext`.
- **REST handlers** (`src/lib/api/v1-handlers.ts`, server-only): the iOS side. `restGet(inputSchema, run)` (`src/lib/api/rest.ts`) reads the input from the query string and the route's path parameters (a path parameter wins over a query field of the same name), checks it, calls the service and answers JSON. `restGet(inputSchema, run, cache)` lets the CDN keep a successful answer ([Caching](#caching)): `"deploy"`, or a function of the answer that returns `{ maxAge }`; without it every answer is `Cache-Control: no-store`. `restPost(inputSchema, run)` does the same with the JSON body in place of the query string, and is never kept. `rateLimited(handler)` puts a handler behind the [rate limit](#rate-limit). `restHandlers(handlers, access)` puts every method behind `guarded` and adds an `ANY` handler, guarded too, that answers every other method 405, with `Allow` naming the route's own methods. `guarded(handler, access)` refuses a cross-origin browser call ([Cross-origin calls](#cross-origin-calls)), then, with `access` `"client"` (the default), a call without an accepted client key and app version ([Client identification](#client-identification)), before the handler and so before the rate limit runs. Only `openApiHandlers` passes `"anyone"`.
- **REST routes** (`src/routes/api/v1/<operation>.ts`, or a nested path such as `$network/puzzles/today.ts` for `/api/v1/{network}/puzzles/today`, `$network/puzzles/index.ts` for `/api/v1/{network}/puzzles` and `$network/puzzles/$number/guesses.ts` for `/api/v1/{network}/puzzles/{n}/guesses` and `$network/puzzles/$number/reveal.ts` for its reveal; `openapi[.]json.ts` for `/api/v1/openapi.json`, the brackets keeping the dot): a file route with only `server.handlers`, the operation's handlers from `v1-handlers.ts`. `src/routes/api/v1/$.ts` answers every other path under `/api/v1` 404 in the error format, not with the site's not-found page.

## Errors

Every error a REST route answers has one shape (`apiErrorBodySchema`, `src/lib/api/api-error.ts`) and the status that belongs to its code:

```json
{ "error": { "code": "invalid_input", "message": "✖ Invalid input: expected \"nl\"\n  → at network" } }
```

| Code | Status | When |
| --- | --- | --- |
| `invalid_input` | 400 | The input does not match the operation's schema; the message lists zod's issues. |
| `unknown_client` | 401 | A REST call without an accepted `Trackdown-Client-Key` or a valid `Trackdown-App-Version` ([Client identification](#client-identification)); every route but `openapi.json`. |
| `game_not_over` | 403 | A reveal before the game is over ([The reveal](#the-reveal)). |
| `cross_origin` | 403 | A browser call from another origin ([Cross-origin calls](#cross-origin-calls)). |
| `not_found` | 404 | No operation at that path, or a service's `ApiError` for something that does not exist. |
| `method_not_allowed` | 405 | A method other than the operation's (`Allow` names it). |
| `rate_limited` | 429 | Past the [rate limit](#rate-limit) of a guess and the reveal; `Retry-After` says in how many seconds the IP may call again. |
| `internal_error` | 500 | Any error that is not an `ApiError`. It is logged to the server's console; the answer carries a generic message, never the error's own (a file path, a schema issue). |

The message is for a developer, not for a player: the app shows its own text per code.

A server function's error reaches the web's query as a thrown error, which the route's error page shows ([site-shell.md](site-shell.md)).

## Caching

A REST answer says how long it may be kept (`RestCache`, `src/lib/api/rest.ts`):

| Cache | Headers | For |
| --- | --- | --- |
| `none` (default) | `Cache-Control: no-store` | Every error, a guess, the reveal, and every answer that changes between deploys at no fixed moment (`meta`, `puzzleArchive`). |
| `{ maxAge }` | `Cache-Control: public, max-age=<maxAge>`, `Vercel-CDN-Cache-Control: public, max-age=<maxAge>` | An answer that holds until a known moment: `todayPuzzle`, for the seconds left until `nextPuzzleAt`. A `maxAge` of 0 or less is `no-store`. |
| `deploy` | `Cache-Control: public, max-age=86400`, `Vercel-CDN-Cache-Control: public, max-age=31536000` | An answer that only changes with a deploy (`stations`, the OpenAPI document). |

`Vercel-CDN-Cache-Control` is read by Vercel's CDN only and not passed on. With `deploy` the CDN keeps the answer for a year, per URL (so per `locale`), and its cache belongs to one deployment, so a new deploy answers afresh; a client (the iOS app, a browser) keeps it for a day. An error is never kept, whatever the operation's cache.

## Abuse protection

The game data is private: the API must make scraping the whole data set slow and visible. Its guards live in `src/lib/api/request-guard.ts`.

- **One puzzle's trips at most**: no operation answers trips from more than one puzzle. A guess answers its own trip and its earlier guesses' trips again, the reveal the trips of one finished game; the archive, today's puzzle and the stations answer none ([Operations](#operations)).
- **Caching** keeps the answers that hold for everyone at the CDN and every guess and reveal out of it ([Caching](#caching)).

### Rate limit

A guess and the reveal share one limit per IP: 60 calls a minute in a fixed window (`gameRateLimit`), ten games' worth for a person and some seven minutes per puzzle for a scraper trying all 395 stations. The REST routes (`rateLimited`, `src/lib/api/rest.ts`) and the web's server functions (`guardGameRequest` in `submitGuessFn`, `revealAnswerFn`) count against the same limit, so neither is a way around the other. Past it the call answers `rate_limited` (429) with `Retry-After`, and the service never runs.

- **The IP** is `x-real-ip`, else the first entry of `x-forwarded-for` (`clientIp`). Vercel sets both itself, so a client cannot choose its own. Without them (locally, in a test) every call shares `unknown`.
- **The counter** is `RateLimit` (`src/lib/api/rate-limit.ts`): one TanStack Pacer `RateLimiter` (`@tanstack/pacer`, fixed window) per IP, held in the server instance's memory. Keys whose window has ended are swept out once it holds 10,000 IPs.
- **Per instance**: on Vercel each warm function instance counts on its own, so the limit is a brake, not an exact global count. A Vercel WAF rate-limit rule or a shared store (Upstash) can take over if a scraper spreads across instances.

### Cross-origin calls

Browsers may only call the API from the site's own origin. Every REST route (`guarded`: each method, the 405 handler, so a preflight too, and an unknown path) and the game's server functions answer a call whose `Origin` header names another host, or is `null`, with `cross_origin` (403) before anything else (`crossOriginError`). The site's own origin is the request's own host. The answer carries no CORS headers, so the browser keeps even the error from the calling page. A call without `Origin` is not a cross-origin browser call: the iOS app, `curl`, or the site's own page loads; it goes on to the [client check](#client-identification) and the rate limit.

### Client identification

Every REST call names the client that makes it, so iOS traffic is told apart from everything else and a client can be cut off, without accounts. Two headers, both required on every route under `/api/v1` except `GET /api/v1/openapi.json` (which holds no game data and is read by tooling):

```text
GET /api/v1/nl/puzzles/today
Trackdown-Client-Key: 9f2c4e…
Trackdown-App-Version: 1.4.2
```

- **`Trackdown-Client-Key`**: one of the keys in `TRACKDOWN_CLIENT_KEYS`, a runtime variable on the server ([deploy.md](deploy.md#the-vercel-project)), comma-separated so a rotation can keep the old key beside the new one. It is read on every call.
- **`Trackdown-App-Version`**: the app's version, `major.minor` or `major.minor.patch` (`1.4.2`), so the logs say which build a call came from.
- **Refused** with `unknown_client` (401) when the key is missing or not accepted, or the version is missing or not of that form, and logged ([Logs](#logs)). The check (`unknownClientError`, `src/lib/api/client-identification.ts`) runs after the cross-origin check and before the rate limit, so a refused call never counts against an IP's limit. The header names live in `src/lib/api/client-headers.ts`, shared with the OpenAPI document.
- **Unset** `TRACKDOWN_CLIENT_KEYS` accepts no key: every REST call but the document is refused, and the server logs one `console.error` per instance saying so. Locally, `.env.example` sets it to `local-dev-key` for `bun run start`, which reads `.env.local`; for `bun run dev`, export it in the shell that starts the server.
- **Only the REST routes.** The web's server functions do not go through `guarded` and never need the headers; they keep their cross-origin check and the rate limit.
- **Not a secret.** The key ships inside the app, so anyone can pull it out of the binary. It names a client; it does not prove one. It makes casual scraping a deliberate act and gives one switch to turn a leaked key off. Proof that a call comes from a genuine app on a genuine device is [App Attest](#app-attest-planned), later.

#### Rotating a key

A key is rotated on a schedule (with each major app release) and at once when it is abused.

1. **Make a new key**: `openssl rand -hex 32`. Keys are opaque: no commas, no spaces.
2. **Accept both**: set `TRACKDOWN_CLIENT_KEYS` to `<old>,<new>` in the Vercel project, for Production and Preview (`vercel env rm TRACKDOWN_CLIENT_KEYS production`, then `vercel env add TRACKDOWN_CLIENT_KEYS production`, the same for `preview`). A changed variable reaches only new deploys, so redeploy (run the deploy workflow).
3. **Ship the app** with the new key in its build configuration.
4. **Drop the old key** once the app versions that carry it are no longer in use (the version header in the logs shows when): set `TRACKDOWN_CLIENT_KEYS` to `<new>` and redeploy. An app still on the old key then answers `unknown_client`, and shows its own "update the app" text.

**Cutting off abuse** is step 4 straight away: remove the abused key, redeploy, and ship an app with a new one. Honest players on an old build lose the API until they update, so cut a key off only for abuse the [rate limit](#rate-limit) does not hold.

#### App Attest (planned)

The client key names the app; Apple's App Attest can prove it. The plan, for when the key is not enough:

1. **Attest once**: the app makes a key pair in the Secure Enclave (`DCAppAttestService.generateKey`), asks the server for a challenge, and sends Apple's attestation of the key with it to a new `POST /api/v1/attest`. The server checks the attestation against Apple's root certificate, the app's Team ID and bundle ID and the challenge, and keeps the key's public key and counter (a store such as Upstash Redis: the server keeps no state today).
2. **Assert per call**: each call carries an assertion over a hash of the request (`generateAssertion`), checked against that public key, with the counter only ever rising, in place of or beside `Trackdown-Client-Key`.
3. **Roll out softly**: log failed assertions first, refuse them only once every supported app version attests. App Attest needs iOS 14 and a real device; the simulator and older devices keep the client key.

Open questions for its spike: where the per-device state lives on Vercel, the cost of an assertion check on every guess, and the fallback when Apple's service is down (`DCError.serverUnavailable`).

### Logs

Abuse shows up in the function logs as `console.warn` lines starting with `API abuse:`: `an IP passed the rate limit` (with `ip`, `path`, `limit` and `windowMs`, once per IP per window, so a scraper does not flood the logs), `a cross-origin call was refused` (with `origin`, `path` and `ip`) and `a call from an unknown client was refused` (with `reason`, `appVersion`, `path` and `ip`; never the key).

## Versioning

Every REST route lives under `/api/v1`. A change the iOS app already in the App Store would break on (a field removed or renamed, a meaning changed) goes under `/api/v2` beside v1, until v1's last app version is gone. A new field or a new operation is not a break and stays in v1. Server functions are not versioned: the web and its server ship together.

The router's locale rewrite also matches `/en/api/v1/…` ([i18n.md](i18n.md#locale-routing)); the app always calls the path without a prefix.

## Adding an operation

1. Add its input and output schema to `src/lib/game/schemas.ts`.
2. Write the service in `src/lib/game/<operation>.ts`, server-only, taking `(input, context: ServiceContext)`, with a test on the fixture beside it.
3. Add the server function to `<operation>.functions.ts` and its factory to `<operation>.queries.ts` ([data-loading.md](data-loading.md#adding-a-read)).
4. Add its handlers to `src/lib/api/v1-handlers.ts` and a route file `src/routes/api/v1/<operation>.ts` that hands them to Start, and test the handlers in `v1-handlers.test.ts`.
5. Add it to `operations` in `src/lib/api/openapi.ts` (and any new output schema to its registry), run `bun run openapi` and commit `openapi/v1.json`.
6. Add a row to the table in [Operations](#operations).

## Tests

`src/lib/game/meta.test.ts` runs the service and its schemas on the fixture. `src/lib/game/today-puzzle.test.ts` runs `getTodayPuzzle` at fixed instants on the fixture with its schedule carried on for 400 days: puzzle 142 on 6 November 2026, the switch at Amsterdam midnight in winter and summer, both clock changes, no station in the answer and a day without a puzzle. `src/lib/game/puzzle-archive.test.ts` runs `getPuzzleArchive` on the fixture's five puzzles: the list up to today's, oldest first, the next puzzle taken in at Amsterdam midnight, the whole schedule once it has ended, an empty list before puzzle 1 and no station in the answer. `src/lib/game/stations.test.ts` runs `getStations` on the fixture: every station with its code, name and province, nothing its strict schema does not name, no station that is only a change in a trip, the English province names and the input's defaults. `src/lib/game/guess.test.ts` runs `submitGuess` on the fixture's puzzle 2, with five stations added, with trips, so a seventh guess can be made: the redaction of change stations by the earlier guesses, the earlier trips answered again with a change the guess just found named, a correct guess without a trip, no mystery station in a wrong guess's answer, an earlier puzzle, and every rejection. `src/lib/game/reveal.test.ts` runs `revealAnswer` on the same puzzle, its five added stations given trips so a game can run to six wrong guesses: a solved game's station and full trips, a solve on the first and the sixth guess, a missed game, an earlier puzzle, `game_not_over` without the answer for a game that is not over, and every rejection. `src/lib/api/v1-handlers.test.ts` calls the REST handlers with a `Request` and path parameters, as Start does, with `serviceContext` mocked to read the fixture at a fixed time: the answer, a bad input, a body that is not a JSON object, a server error that keeps its message to itself, a day without a puzzle, the archive up to today's without its stations, a guess at a future puzzle (404), a reveal of a finished game and of one not over (403), the cache headers of a kept answer, of today's puzzle until the next one and of their errors, another method and an unknown path, a guess past the rate limit (429 with `Retry-After`, logged once), the limit per IP and shared with the reveal, and a cross-origin call, a preflight and an `Origin` of `null` refused (403) while the site's own origin and a call without `Origin` are answered; every call carries the app's two headers, with `TRACKDOWN_CLIENT_KEYS` stubbed to two keys, and a call without them, with a key not accepted, without a version or with a malformed one, or while the variable is unset is refused (401, logged), both keys of a rotation are accepted, refused calls never spend the rate limit, and another method and an unknown path are guarded too. `src/lib/api/rate-limit.test.ts` runs `RateLimit` on a faked clock: the limit, the window's first refusal, a new window and keys counted apart. `src/lib/api/openapi.test.ts` validates the OpenAPI document against the OpenAPI 3.1 schema (`@seriousme/openapi-schema-validator`), resolves every `$ref`, checks that its paths are exactly the route files under `src/routes/api/v1/` (all but `$.ts`) with their methods, that no schema forbids extra properties, that every error code has its response, that every operation but the document's asks for the client's two headers, that `openapi/v1.json` is what it generates, and that `GET /api/v1/openapi.json` answers it without a client key, with the `deploy` cache.
