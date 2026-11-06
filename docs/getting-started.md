# Getting started

## Prerequisites

- Bun, at the version in `.bun-version`. `bunfig.toml` only installs package versions published at least three days ago.

## Scripts

See the table in the [README](../README.md#scripts).

- `bun run dev` starts Vite's development server on port 3000, with the TanStack devtools (router and query panels) in the corner of the page.
- `bun run build` writes the production build to `.output/`: Nitro bundles the Start server with its default preset, a Node server at `.output/server/index.mjs`.
- `bun run start` runs that server with Node, passing `.env` and `.env.local` with `--env-file-if-exists`. `bun run preview` serves the same build through Vite.
- `bun run typecheck` runs the TypeScript 7 compiler (`typescript-7`, installed as an alias of `typescript@7`) with `--noEmit`. The `typescript` package stays at 6 for ESLint's parser and editors.
- `bun run lint` runs ESLint with the flat config in `eslint.config.mts`, Prettier included as a rule.
- `bun run test` runs Vitest once.
- `bun run format` writes Prettier's formatting; `bun run check` only reports files that differ.

## Unit tests

Vitest (`vitest.config.ts`) runs the tests in `src/**/*.test.{ts,tsx}`. The config uses only the `@/` alias (`resolve.tsconfigPaths`), not the Start and Nitro plugins: the tests never load a route or the server entry. Stubbed environment variables, globals and spies are restored after every test. A component test renders with `renderToString` from `react-dom/server`, as `src/components/home/home-page.test.tsx` does.

## The verify loop

Run these after every change:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

## Generated code

- `src/routeTree.gen.ts` is written by the TanStack Router plugin whenever Vite runs (`dev` or `build`). It is committed, so a fresh clone type-checks before its first build. Add or rename a route, run `bun run build` or `bun run dev`, and commit the regenerated file with the route.

## shadcn/ui

`components.json` sets the CLI up for the Trackdown design canvas (Web · Playing, Web · Solved):

- **Style `base-vega`.** Base UI primitives, which have the combobox the station search needs. Vega draws rounded rectangles at a comfortable size (36px inputs, 40px large buttons), the closest to the design's 10 to 16px corners and 44 to 52px controls. Mira, SkoonHome's style, is built for dense screens (28px inputs); Maia and Luma round inputs and buttons into pills, which the design keeps for the network picker only.
- **Icons: Lucide** (`lucide-react`). The design's icons are 24px stroke icons, stroke width 2 with round caps, in Lucide's shapes (its chevron is Lucide's `ChevronDown`). The logo and the trip line are the design's own SVG, not icons.
- **Base colour `neutral`** and `--radius: 0.75rem` in `src/styles.css`. The radius scale gives 8, 10, 12 and 16px (`rounded-sm` to `rounded-xl`). The colours are shadcn's neutral theme until the design's tokens and the Barlow fonts replace them.

The design is taller than any style's defaults: its main buttons, input and list options are 52px, its icon buttons 44px. A component added with `bunx shadcn add` gets those sizes as variants when a page needs them, not by changing the style.

## Stack

- TanStack Start, Router and Query (React 19) on Vite 8, with Nitro (`nitro/vite`, default preset) bundling the server into `.output/`.
- Every page renders on the server; the placeholder home page is `src/routes/index.tsx`.
- Tailwind CSS 4 (`src/styles.css`) and shadcn/ui (`components.json`). `cn` lives in `src/lib/utils.ts`. See [shadcn/ui](#shadcnui).
- Strict TypeScript (`tsconfig.json`) with the `@/*` alias for `src/*`.
- ESLint and Prettier (`eslint.config.mts`, `.prettierrc`), Vitest (`vitest.config.ts`).
- Data loading through server functions and TanStack Query. See [data-loading.md](data-loading.md).
