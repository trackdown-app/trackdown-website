# Repository Instructions

- Use Bun for package management and scripts in this repository.
- Prefer `bun install` for dependencies and `bun run <script>` for package scripts.
- Do not use `npm`, `pnpm`, or `yarn` unless explicitly requested.

## TypeScript

- TypeScript strict mode is enabled; use proper types for everything.
- Never use type casting like `as SomeType`; fix types properly instead.
- Never use `any`.
- Never use `// @ts-nocheck` or `// @ts-ignore`; fix types properly instead.
- Use type imports for types, for example `import type { QueryClient } from "@tanstack/react-query"`.
- One React component per `.tsx` file, small helper components included; give each its own file named after it. Enforced by `react/no-multi-comp`.
- Use the `@/*` path alias for source imports.
- Run TypeScript (`bun run typecheck`) and lint (`bun run lint`) every time code edits are made.
- Generated files are exempt from these rules and must not be hand-edited: `src/routeTree.gen.ts` (TanStack Router). Fix the generator's input instead.

## UI components

- Before building a control or UI element that `src/components/ui/` does not have yet, check whether shadcn/ui has it (`bunx shadcn add <name> --view` shows the source without writing it). If it does, add it with the CLI instead of hand-rolling markup.
- Adapt what the CLI adds: split it one component per file, trim it to the parts used, and revert any existing file the CLI rewrote.
- Import `cn` from `@/lib/utils`, never from the `cn` package. Enforced by `no-restricted-imports`.
- Build only what shadcn/ui does not offer, and say why in a comment.

## Documentation

- `README.md` is a short landing page and an index; the substance lives in `docs/`.
- Keep `docs/` in step with the code in the same change. A change to behaviour, a route, an environment variable, a script or a workflow is not done until the matching doc says the new truth.
- Which doc owns what:
  - `docs/getting-started.md`: prerequisites, scripts, the verify loop, generated code, the stack.
  - `docs/data-loading.md`: server functions and TanStack Query, the query client in `src/router.tsx`, the `*.queries.ts` factories, how a route loads and reads them.
  - `docs/data.md`: the game data's files and zod schemas, the network registry, the server-only loader and its cache, the fixture, `data:check`.
  - `docs/api.md`: the services in `src/lib/game/`, their server functions and REST routes under `/api/v1`, the shared schemas, the error format, versioning, the table of operations.
  - `docs/design-system.md`: the design's colour tokens in light and dark, the Barlow fonts, shape, the contrast test, defaults for what the design does not draw.
  - `docs/i18n.md`: Paraglide, locale routing (`/` Dutch, `/en` English), the language switch, messages and their compile step.
  - `docs/site-shell.md`: the skip link, focus ring, header, footer and its legend slot, the shell's page paths, the not-found and error pages.
  - `docs/station-search.md`: the station search combobox, its matching, keyboard and screen reader behaviour, the combobox parts in `src/components/ui/`.
  - `docs/guess-list.md`: the guess list, its rows and summaries, the trip line's width, segments, change rings and labels, the time grid, the game legend, the screen reader text.
  - `docs/game.md`: the game page at `/`, its route and loader, the progress dots, the game state and the guess mutation, how a game is kept in `localStorage`.
  - `docs/statistics.md`: the player's record (played, won, streaks, guesses needed), how it is worked out from kept games, the streak rules, the record on the solved screen, the statistics dialog and its dialog parts in `src/components/ui/`.
  - `docs/share.md`: the share text and its grid, the Web Share API and clipboard fallback, the Share result button, the "What you'll share" preview.
  - `docs/how-to-play.md`: the How to play page at `/hoe-te-spelen`, its rules, example trip and legend.
  - `docs/archive.md`: the archive at `/archief` and its list, playing an earlier puzzle at `/archief/{number}`, the 404 for a future puzzle, the archive mark that keeps a game out of the streak.
  - `docs/deploy.md`: Nitro's preset detection, the `.vercel/output` layout, the function region, the game data's build-time variables, the deploy workflow and its secrets, the Vercel project and its environments, a manual deploy.
  - `docs/logging.md`: server logs and traces, PostHog EU, startup validation, Vercel flushing, privacy filtering, and the telemetry tests.
  - `docs/analytics.md`: the consent banner and status, native consent forms and cookie settings, the versioned consent cookie, and the browser analytics integration contract.
- A new feature area gets its own `docs/<feature>.md`, an entry in the README's documentation list and a line in the list above.

## Strict Boolean Expressions

- Explicitly check nullable values with `value != null`.
- Explicitly check arrays with `array.length > 0`.
- Do not use truthy checks for nullable values, such as `if (value)` or `if (array)`.
- Boolean checks are fine for actual booleans, such as `if (isLoading)` or `if (!isError)`.
