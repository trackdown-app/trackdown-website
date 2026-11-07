# Getting started

## Prerequisites

- Bun, at the version in `.bun-version`. `bunfig.toml` only installs package versions published at least three days ago.
- For the game data: a clone of the private `trackdown-app/trackdown-data` next to this repository (`../TrackdownData`), and `.env.example` copied to `.env.local`. Without it the site runs without data ([deploy.md](deploy.md#the-game-data)).

## Scripts

See the table in the [README](../README.md#scripts).

- `bun run dev` starts Vite's development server on port 3000, with the TanStack devtools (router and query panels) in the corner of the page.
- `bun run build` writes the production build to `.output/`: Nitro bundles the Start server with the preset it detects, outside Vercel a Node server at `.output/server/index.mjs`. Under `vercel build` it writes `.vercel/output/` instead ([deploy.md](deploy.md)).
- `bun run start` runs that server with Node, passing `.env` and `.env.local` with `--env-file-if-exists`. `bun run preview` serves the same build through Vite.
- `bun run typecheck` runs the TypeScript 7 compiler (`typescript-7`, installed as an alias of `typescript@7`) with `--noEmit`. The `typescript` package stays at 6 for ESLint's parser and editors.
- `bun run lint` runs ESLint with the flat config in `eslint.config.mts`, Prettier included as a rule.
- `bun run test` runs Vitest once.
- `typecheck`, `lint` and `test` each run `bun run paraglide:compile` first, which compiles the messages into `src/paraglide/` (skipped when nothing changed). See [i18n.md](i18n.md#compiling).
- `bun run data:check [dir]` reads every file of a trackdown-data `data/` folder through the loader and lists what does not match ([data.md](data.md#checking-the-data)).
- `bun run build:guard [dir]` runs after a build and fails when a file, puzzle, station or trip of a trackdown-data `data/` folder shows up in the static output ([data.md](data.md#the-build-guard)).
- `bun run openapi` writes `openapi/v1.json`, the OpenAPI document of `/api/v1`, from the shared schemas; `bun run openapi:check` only fails when the committed file differs ([api.md](api.md#the-openapi-document)).
- `bun run format` writes Prettier's formatting; `bun run check` only reports files that differ.

## Unit tests

Vitest (`vitest.config.ts`) runs the tests in `src/**/*.test.{ts,tsx}`. The config uses only the `@/` alias (`resolve.tsconfigPaths`), not the Start and Nitro plugins: the tests never load the server entry. `src/router.test.tsx` loads the route tree through `getRouter` and renders requests with the router's own SSR request handler, to check the status codes ([site-shell.md](site-shell.md#not-found-and-error-pages)). Stubbed environment variables, globals and spies are restored after every test. A component test renders on the server with `react-dom/server`; one that reads the location renders inside a memory router with `renderAt` (`src/test/render-at.tsx`), as `src/components/layout/site-header.test.tsx` does. A test that needs the browser, to type and press keys, starts with `// @vitest-environment happy-dom` and renders with Testing Library (`@testing-library/react`, driven by `@testing-library/user-event`), as `src/components/game/station-search.test.tsx` does; it calls `cleanup()` after each test. `src/test/setup.ts` puts the base locale back after every test ([i18n.md](i18n.md#tests)).

## The verify loop

Run these after every change:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

## Continuous integration

`.github/workflows/pr.yml` runs the verify loop on every pull request, as six checks: Install, Typecheck, Lint, Test, OpenAPI and Build.

- Install runs `bun install --frozen-lockfile` and caches `node_modules`, keyed on `bun.lock`. The other four jobs restore that cache and fail if it is missing; they install only the Bun binary, at the version in `.bun-version`.
- Every action is pinned to a commit SHA, with its release in a trailing comment.
- Build builds with the fixture as the game data (`TRACKDOWN_DATA_DIR=fixtures/trackdown-data`), then runs `bun run build:guard` on it, so a change that would put data in the static output fails the check ([data.md](data.md#the-build-guard)).
- OpenAPI runs `bun run openapi:check`, so a schema change without a regenerated `openapi/v1.json` fails the check ([api.md](api.md#the-openapi-document)).
- The jobs read only this repository. The build needs no private data, so CI holds no token or secret for another repository. Deploys, which do bring in the data, are a separate workflow ([deploy.md](deploy.md#the-deploy-workflow)).

`.github/dependabot.yml` proposes weekly updates for the packages (the `bun` ecosystem, which updates `bun.lock`, with a three-day cooldown like `bunfig.toml`) and for the pinned actions.

## Generated code

- `src/routeTree.gen.ts` is written by the TanStack Router plugin whenever Vite runs (`dev` or `build`). It is committed, so a fresh clone type-checks before its first build. Add or rename a route, run `bun run build` or `bun run dev`, and commit the regenerated file with the route.
- `openapi/v1.json` is written by `bun run openapi` from the shared zod schemas. It is committed for the iOS app to generate its client from; CI and a unit test fail when it is stale. Never edit it by hand ([api.md](api.md#the-openapi-document)).
- `src/paraglide/` is written by Paraglide from `messages/` (the Vite plugin, and `bun run paraglide:compile` on `postinstall` and before `typecheck`, `lint` and `test`). It is not committed. See [i18n.md](i18n.md).

## shadcn/ui

`components.json` sets the CLI up for the Trackdown design canvas (Web · Playing, Web · Solved):

- **Style `base-vega`.** Base UI primitives, which have the combobox the station search needs. Vega draws rounded rectangles at a comfortable size (36px inputs, 40px large buttons), the closest to the design's 10 to 16px corners and 44 to 52px controls. Mira, SkoonHome's style, is built for dense screens (28px inputs); Maia and Luma round inputs and buttons into pills, which the design keeps for the network picker only.
- **Icons: Lucide** (`lucide-react`). The design's icons are 24px stroke icons, stroke width 2 with round caps, in Lucide's shapes (its chevron is Lucide's `ChevronDown`). The logo and the trip line are the design's own SVG, not icons.
- **Base colour `neutral`** and `--radius: 0.75rem` in `src/styles.css`. The radius scale gives 8, 10, 12 and 16px (`rounded-sm` to `rounded-xl`). The base colour only matters to the CLI: `src/styles.css` maps every shadcn colour role onto the design's tokens, and the fonts are Barlow and Barlow Condensed. See [design-system.md](design-system.md).

The design is taller than any style's defaults: its main buttons, input and list options are 52px, its icon buttons 44px. A component added with `bunx shadcn add` gets those sizes as variants when a page needs them, not by changing the style.

## Stack

- TanStack Start, Router and Query (React 19) on Vite 8, with Nitro (`nitro/vite`, preset detected from the environment) bundling the server into `.output/`, or `.vercel/output/` on Vercel. See [deploy.md](deploy.md).
- Every page renders on the server; the home page, `src/routes/index.tsx`, is today's game ([game.md](game.md)). Every page sits inside the site shell: skip link, header and footer, with not-found and error pages ([site-shell.md](site-shell.md)).
- Tailwind CSS 4 (`src/styles.css`) and shadcn/ui (`components.json`). `cn` lives in `src/lib/utils.ts`. See [shadcn/ui](#shadcnui) and [design-system.md](design-system.md) for the tokens and fonts.
- Strict TypeScript (`tsconfig.json`) with the `@/*` alias for `src/*`.
- ESLint and Prettier (`eslint.config.mts`, `.prettierrc`), Vitest (`vitest.config.ts`).
- Data loading through server functions and TanStack Query. See [data-loading.md](data-loading.md).
- The game data read by a server-only loader with zod schemas (`src/lib/data/`). See [data.md](data.md).
- TanStack Pacer for the API's rate limit per IP (`src/lib/api/rate-limit.ts`). See [api.md](api.md#abuse-protection).
- Paraglide JS for Dutch (base, at `/`) and English (under `/en`). See [i18n.md](i18n.md).
