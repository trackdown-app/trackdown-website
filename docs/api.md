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

`dataRef` is the trackdown-data commit the build was made from, or `local` ([deploy.md](deploy.md#the-game-data)).

```text
GET /api/v1/meta?network=nl

200 {"source":"…","feed":"…","serviceDates":["20261203"],"departureWindow":[540,600],
     "minChangeMinutes":3,"changePenaltyMinutes":5,"stations":395,"mysteryStations":395,
     "builtAt":"2026-11-07T12:00:00.000Z","network":"nl","dataRef":"3f2a…"}
```

## The pieces

- **Schemas** (`src/lib/game/schemas.ts`): the input and output schema of every operation, in one place. They hold no data and no server code, so the browser may import them, and they are the contract the iOS app follows.
- **Services** (`src/lib/game/<operation>.ts`, server-only): one function per operation, `(input, context) => Promise<output>`. The input is already checked. Everything else it reads comes from the `ServiceContext` it is given (`src/lib/game/service-context.ts`): the game data and the data's commit. The server function and the REST route pass `serviceContext`, which reads the real data; a test passes the fixture. A service throws an `ApiError` for an answer that is the caller's fault (a puzzle that does not exist yet); any other error is a server error.
- **Server functions** (`src/lib/game/<operation>.functions.ts`) and **query options** (`<operation>.queries.ts`): the web's side, as in [data-loading.md](data-loading.md#the-pieces). The validator is the operation's input schema, the handler calls the service with `serviceContext`.
- **REST handlers** (`src/lib/api/v1-handlers.ts`, server-only): the iOS side. `restGet(inputSchema, run)` (`src/lib/api/rest.ts`) reads the input from the query string, checks it, calls the service and answers JSON with `Cache-Control: no-store`. `restHandlers` adds an `ANY` handler that answers every other method 405 with `Allow: GET`.
- **REST routes** (`src/routes/api/v1/<operation>.ts`): a file route with only `server.handlers`, the operation's handlers from `v1-handlers.ts`. `src/routes/api/v1/$.ts` answers every other path under `/api/v1` 404 in the error format, not with the site's not-found page.

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

`src/lib/game/meta.test.ts` runs the service and its schemas on the fixture. `src/lib/api/v1-handlers.test.ts` calls the REST handlers with a `Request`, as Start does, with `serviceContext` mocked to read the fixture: the answer, a bad input, a server error that keeps its message to itself, another method and an unknown path.
