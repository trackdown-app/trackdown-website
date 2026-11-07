# Server logs and traces

The Node server sends operational logs and OpenTelemetry traces to PostHog EU. This adapts SkoonHome's logger, console bridge, request and server-function spans, and `fetch` instrumentation to Vercel. It does not collect browser analytics or identify players.

## Startup and configuration

`src/config/telemetry.ts` is a Nitro startup plugin, registered in `vite.config.ts`. It calls `startTelemetry` before the first request and shuts the providers down through Nitro's `close` hook. A typed `globalThis.trackdownTelemetry` singleton shares the providers between the separately bundled Nitro plugin and SSR entry, and starts them once per warm instance.

`POSTHOG_PROJECT_TOKEN` is read from the runtime environment, never a `VITE_` variable or a build definition. The value must be a PostHog project token beginning with `phc_`; startup errors never repeat its value. When `VERCEL=1`, a missing or empty value stops startup. Locally it may be empty: logs still go to the console, while spans and remote export are disabled. `.env.example` leaves it empty.

Store the token as a sensitive variable in the existing Vercel project's Preview and Production environments. New deployments pick it up; existing deployments retain their old configuration ([deploy.md](deploy.md#the-vercel-project)). The token is not committed to this public repository.

The providers use these endpoints with `Authorization: Bearer <POSTHOG_PROJECT_TOKEN>`:

| Signal | Provider and transport | Endpoint |
| --- | --- | --- |
| Logs | `LoggerProvider`, `BatchLogRecordProcessor`, OTLP HTTP/JSON | `https://eu.i.posthog.com/i/v1/logs` |
| Traces | `TracerProvider`, `BatchSpanProcessor`, OTLP HTTP/protobuf | `https://eu.i.posthog.com/i/v1/traces` |

Every record and span carries `service.name=trackdown-website` and `deployment.environment` (`VERCEL_ENV`, or `development`). `service.version` is included when Vercel supplies `VERCEL_GIT_COMMIT_SHA`; on Vercel, `cloud.provider=vercel` and `cloud.region` identify the platform and region.

An `AsyncLocalStorageContextManager` carries the active span across awaits, so log records include the span and trace IDs. Incoming tracing headers are ignored: each request starts its own trace. No propagator is installed for outgoing requests.

## Requests and operations

`traceRequest` in `src/lib/logging/request-span.ts` wraps the existing locale middleware and Start handler in `src/server.ts`. Each request gets a server span and one access log, with its method, known route template, response status and duration to response headers. A throw gets an error log and a failed span; 5xx responses also mark the request span failed. API request spans include a registered network, numeric puzzle number when present in the path, and an outcome (`ok`, `refused` or `error`). Error responses also add a safe API error code. No input or output body is read for telemetry.

Only registered route templates are kept. For example, `/api/v1/nl/puzzles/42/guesses?guess=...` becomes `/api/v1/{network}/puzzles/{number}/guesses` with network `nl` and puzzle number `42`. Unknown paths become `unknown`, archive numbers become `/archief/{number}`, locale prefixes are removed, and hashed server-function URLs become `/_serverFn/{id}`. Query strings are discarded.

`src/start.ts` registers `serverFunctionSpan` as global function middleware. Every server function gets a child span, including calls from SSR loaders. Its name comes from the fixed list of this application's server functions; its metadata may include network and puzzle number. Handler errors returned by Start's `next()` and thrown errors both mark the span failed. The middleware never records guesses, station codes, results or serialized arguments. The Start configuration explicitly preserves the framework's default CSRF middleware.

`UndiciInstrumentation` adds client spans for server-side `fetch` calls with an active parent. Before a span reaches the batch processor, `privateSpans` drops unknown attributes, all events and links, and status descriptions. Fetch span names become `HTTP fetch`; only the approved method and response status survive. URLs, hosts, headers and exception details are not exported. PostHog's exporters use `node:http`, so they do not trace their own exports.

## Flushing on Vercel

Batch timers alone cannot guarantee delivery on a function that becomes idle. Each request registers a `waitUntil` task with `@vercel/functions`. For a streamed response, that task waits until the response body has been consumed, cancelled or failed before calling both providers' `forceFlush`. This includes spans and logs from late SSR loaders. The response streams through unchanged and is not buffered. A response without a body or a handler that throws flushes immediately. The request span and access-log duration still end at headers, rather than including the time a client takes to read the body.

Warm providers remain active for later requests; there is no per-request shutdown. Export errors are contained and produce a fixed console warning, without changing the response. SDK diagnostics bypass remote logging and suppress their arguments, preventing recursive export failures.

## Privacy boundary

`createLogger(scope)` accepts a fixed set of messages and typed metadata. It emits the same safe values to the original console and the OpenTelemetry logger. Runtime validation in `attributes.ts` checks both attribute keys and values, even if a caller or automatic instrumentation supplies additional fields.

Allowed operational fields are method, route template, status, duration, known server-function name, registered network, puzzle number, outcome and API error code. Resource fields identify the service and deployment.

Never log a mystery station, guessed station, station list, trip, game file, request or response body, query string, token, client key, IP address, user agent, cookie, player identifier or session identifier. Exception messages, names, stacks, causes and custom properties are discarded: even a schema-validation error can contain private game data. The only error detail retained is an application's fixed `ApiError` code, otherwise `internal_error`.

The console bridge replaces `console.warn` and `console.error` with fixed messages and suppresses every original argument in both destinations. Framework and third-party errors therefore reach PostHog without their possibly sensitive payloads. Application code uses `createLogger`; it must never write raw data with other console methods or directly through the OpenTelemetry API.

## Verification

Run `bun run typecheck`, `bun run lint`, `bun run test`, and `bun run build`. `src/lib/logging/telemetry.test.ts` uses fake exporters to verify startup validation, singleton initialization, EU endpoints, resource metadata, request/log correlation, streaming and cancellation flushing, failure status, and removal of secret-like values from console output and exported records. No real token or private game data is used in tests.

After a preview deploy, make a request to a page or uncached API operation. In the PostHog project's Logs, filter `service.name=trackdown-website` and `deployment.environment=preview`. Open its `Request completed` record and follow the trace ID into Tracing. Check the root request and server-function children, then test an invalid or rate-limited API request for its status and outcome. Inspect attributes to confirm that no station, query string, body or token is present. Static files and CDN cache hits do not reach the server and produce no request trace.

PostHog's reference guides: [Node.js logs](https://posthog.com/docs/logs/installation/nodejs) and [Node.js tracing](https://posthog.com/docs/distributed-tracing/installation/nodejs). Vercel's [waitUntil reference](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#waituntil) explains background work after a response.
