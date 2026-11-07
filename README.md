# Trackdown website

The Trackdown website. TanStack Start with shadcn/ui, rendered on the server by a Nitro server.

## Quick start

```bash
bun install
bun run dev
```

The site runs on http://localhost:3000.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Development server on port 3000 |
| `bun run build` | Production build into `.output/` |
| `bun run start` | Runs the production build with Node, with the settings from `.env` and `.env.local` when present |
| `bun run preview` | Serves the production build through Vite |
| `bun run typecheck` | Compiles messages, then type-checks with the TypeScript 7 compiler |
| `bun run lint` | Compiles messages, then runs ESLint (with Prettier) |
| `bun run test` | Compiles messages, then runs Vitest |
| `bun run paraglide:compile` | Compiles `messages/` into `src/paraglide/` (also on `postinstall`) |
| `bun run data:check [dir]` | Checks a trackdown-data `data/` folder (default `TRACKDOWN_DATA_DIR`) against the loader's schemas |
| `bun run build:guard [dir]` | After a build, fails when anything from a trackdown-data `data/` folder (default `TRACKDOWN_DATA_DIR`) is in the static output |
| `bun run openapi` / `openapi:check` | Writes / checks `openapi/v1.json`, the OpenAPI spec of `/api/v1` |
| `bun run format` / `check` | Formats / checks formatting with Prettier |

## Documentation

- [Getting started](docs/getting-started.md)
- [Data loading](docs/data-loading.md)
- [Game data](docs/data.md)
- [API](docs/api.md)
- [Internationalisation](docs/i18n.md)
- [Design system](docs/design-system.md)
- [Site shell](docs/site-shell.md)
- [Station search](docs/station-search.md)
- [Guess list](docs/guess-list.md)
- [Game page](docs/game.md)
- [Sharing a result](docs/share.md)
- [Statistics](docs/statistics.md)
- [How to play](docs/how-to-play.md)
- [Deploy](docs/deploy.md)
