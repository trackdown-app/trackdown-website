# Data loading

Every application read, from a route's loader or from the browser, goes through a server function and TanStack Query. Game mutations do too. The browser never calls an API of its own: no `fetch` to a URL. The REST routes under `/api/v1` are for the iOS app; they call the same services as the server functions ([api.md](api.md)). Cookie choices use a native POST to `/consent`, so they also work without JavaScript ([analytics.md](analytics.md)).

## The pieces

- **Server functions** (`createServerFn`, method `GET` for a read) in a `*.functions.ts` file next to the module they read. They are thin: check the input, call the code that does the work, return plain data. Their handlers run on the server only, so what they read never ships in the browser's JavaScript. Only server functions belong in a `*.functions.ts` file: the browser's build drops a handler's imports but keeps every import that code outside a handler uses.
- **Query options** in a `*.queries.ts` file beside each `*.functions.ts`: one `queryOptions` factory per read, whose `queryFn` calls the server function. The factory is the one place that names the query's key and how long its answer stays fresh.
- **Routes** fill the query in their loader with `context.queryClient.ensureQueryData(...)`, which answers from the cache while the answer is fresh and asks the server when it is not. The component reads the same query with `useSuspenseQuery`, which never waits, because the loader filled it.
- **Components** below a page that read on their own use `useQuery` with the same factories.

```ts
export const Route = createFileRoute("/tracks/")({
    loader: async ({ context }) => {
        await context.queryClient.ensureQueryData(tracksQueryOptions());
    },
    component: TracksIndex,
});

function TracksIndex() {
    const { data: tracks } = useSuspenseQuery(tracksQueryOptions());
    return <TracksPage tracks={tracks} />;
}
```

A network's game page loads today's puzzle and the stations this way, sends each guess through a mutation and reads the finished game's answer through a query ([game.md](game.md)). The archive loads the puzzle list, and an earlier puzzle's page the list and the stations ([archive.md](archive.md)). The game's operations (`metaQueryOptions`, `todayPuzzleQueryOptions`, `puzzleArchiveQueryOptions`, `stationsQueryOptions` and `revealQueryOptions` so far) live in `src/lib/game/`, each with a service the server function calls ([api.md](api.md#the-pieces)).

## The query client

The root loader also fills `consentQueryOptions` (`src/lib/analytics/consent.queries.ts`) with the request's HTTP-only cookie answer and returns it as loader data for `RootDocument`. The banner is ready on the server and during hydration, including on error pages. Consent stays fresh for the document's lifetime; native consent forms reload after changing it. Root page responses and the consent server function use `Cache-Control: private, no-store` to keep one visitor's choice out of shared caches.

`getRouter` (`src/router.tsx`) builds a `QueryClient` for every router, so one per request on the server and one per page in the browser: a cache shared between requests would keep every request's reads in the server's memory. It puts the client in the router's context (`RouterContext` in `src/routes/__root.tsx`), where every loader reads it.

`setupRouterSsrQueryIntegration` (`@tanstack/react-router-ssr-query`) sends the queries the server render filled to the browser along with the page, so the browser does not read them again, and wraps the app in a `QueryClientProvider` for the hooks.

The router keeps no loader data of its own after a preload (`defaultPreloadStaleTime: 0`): the query cache decides whether the server is asked again. Hovering a link runs its loader (`defaultPreload: "intent"`), and the click reads the same answer from the cache.

**Defaults.** An answer is fresh for 30 seconds unless its factory says otherwise. A failed read is not retried (`retry: false`). Queries do not read again when the window regains focus or the network comes back.

## Adding a read

1. Write the server function in the module's `*.functions.ts`, `GET`, with a validator for any input.
2. Add a factory in the `*.queries.ts` beside it, with a key that starts with the module's name and holds every input (`["tracks", slug]`). Set `staleTime` when the default 30 seconds is wrong for the data.
3. Fill it in the route's loader and read it in the component with `useSuspenseQuery`, or read it in the browser with `useQuery`.

## Changing data

A server function that changes something is a `POST`, and the component calls it through a `useMutation` whose `mutationFn` calls the server function. The mutation holds the call's state (`isPending`, `isError`, `data`), so the component keeps none of its own. After it, the component invalidates the queries whose data the call changed.

### A read sent as a POST

The reveal (`revealAnswerFn`) is a `POST` only because a whole game's guesses travel in its body; it changes nothing. So it is read like any other read, through a factory, `revealQueryOptions` (`src/lib/game/reveal.queries.ts`), whose key holds the network, the puzzle and the guesses. The solved screen reads it with `useQuery` once the game is over ([game.md](game.md#solved-and-missed)); no loader fills it, because the server render has no game. The answer to the same game never changes, so it never goes stale.

## Devtools

The development server's TanStack devtools have a TanStack Query panel beside the router's (`src/routes/__root.tsx`), showing every query in the page's cache. The Vite devtools plugin strips both from production builds.

## Linting

`@tanstack/eslint-plugin-query`'s recommended rules run with ESLint (`eslint.config.mts`): every input a query function uses must be in its key, and query options must not be built in ways that break the cache.
