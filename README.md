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
| `bun run typecheck` | Type-checks with the TypeScript 7 compiler |
| `bun run lint` | Runs ESLint (with Prettier) |
| `bun run test` | Runs Vitest |
| `bun run format` / `check` | Formats / checks formatting with Prettier |

## Documentation

- [Getting started](docs/getting-started.md)
- [Data loading](docs/data-loading.md)
