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

## Stack

- TanStack Start, Router and Query (React 19) on Vite 8, with Nitro (`nitro/vite`, default preset) bundling the server into `.output/`.
- Every page renders on the server; the placeholder home page is `src/routes/index.tsx`.
- Tailwind CSS 4 (`src/styles.css`) and shadcn/ui (`components.json`: `base-mira` style, Base UI primitives, Hugeicons). `cn` lives in `src/lib/utils.ts`.
- Strict TypeScript (`tsconfig.json`) with the `@/*` alias for `src/*`.
- ESLint and Prettier (`eslint.config.mts`, `.prettierrc`), Vitest (`vitest.config.ts`).
- Data loading through server functions and TanStack Query. See [data-loading.md](data-loading.md).
