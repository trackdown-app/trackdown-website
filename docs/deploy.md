# Deploy

Vercel hosts the site and its API. TanStack Start reaches Vercel through Nitro, which writes Vercel's [Build Output API](https://vercel.com/docs/build-output-api) layout into `.vercel/output/` when it builds under `vercel build`.

## The build

`nitro()` in `vite.config.ts` sets no `preset`. Nitro picks one from the environment:

- Under `vercel build` on a laptop (or on Vercel's builders) the `VERCEL` variable is set, so Nitro uses the `vercel` preset and writes `.vercel/output/`.
- Anywhere else, such as a local `bun run build` or CI's Build check, it uses the Node server preset and writes `.output/`, which `bun run start` runs ([getting-started.md](getting-started.md#scripts)).
- On GitHub Actions Nitro detects GitHub before it looks at `VERCEL`, so even `vercel build` would get the Node server preset, and Vercel then fails looking for a static `dist/`. The deploy workflow sets `NITRO_PRESET=vercel` on its build step for that reason.

`NITRO_PRESET=vercel bun run build` forces the `vercel` preset without the Vercel CLI, to look at the output.

`.vercel/output/` holds:

- `static/`: the client build (scripts, the stylesheet, the Barlow fonts) under `/assets/`, served by Vercel's CDN with `Cache-Control: public, max-age=31536000, immutable`, since every file name carries a content hash.
- `functions/__server.func/`: the Start server as one Node function. Every request that matches no static file goes to it, so every page renders on the server.
- `config.json`: the routes that send `/assets/*` to the CDN and the rest to the function.

The function runs in `fra1` (Frankfurt), the Vercel region closest to the Netherlands: `vercel.functions.regions` in the `nitro()` options, which only the `vercel` preset reads. Nitro writes it into the function's `.vc-config.json`.

`.vercel/` is ignored by Git: it holds the build output and the local project link from `vercel link`.

## The game data

The game data lives in the private `trackdown-app/trackdown-data` repository; this repository is public. The data goes into the build, never into Git here, `public/` or the static output, and the token that reads it goes nowhere but the deploy workflow's checkout step.

Two build-time variables, read by `vite.config.ts` (from the environment, or `.env` / `.env.local` through Vite's `loadEnv`):

| Variable | What it is |
| --- | --- |
| `TRACKDOWN_DATA_DIR` | The `data/` folder of a trackdown-data checkout, relative or absolute. Unset, the build carries no data. |
| `TRACKDOWN_DATA_REF` | The trackdown-data commit the build is made from. Unset, it is `local`. |

- **The data.** `TRACKDOWN_DATA_DIR` becomes Nitro's `assets:trackdown-data` storage mount (`serverAssets` in the `nitro()` options), read on the server with `useStorage("assets:trackdown-data")`. In development Nitro reads the files from disk. In a build every file becomes a lazy import inside the server function, so it is loaded only when asked for and is never a static file. Nitro bundles them only once server code calls `useStorage()`, which the loader in `src/lib/data/trackdown-data.ts` does ([data.md](data.md)); while no server function reads it, the build holds no data.
- **The data ref.** `define` writes `TRACKDOWN_DATA_REF` into the build as `import.meta.env.TRACKDOWN_DATA_REF`, for `/api/v1/meta`. It only lands in a bundle whose code reads it. Unit tests run without `vite.config.ts`, so a test that reads it stubs it with `vi.stubEnv`.
- **Locally.** Copy `.env.example` to `.env.local`. It points `TRACKDOWN_DATA_DIR` at `../TrackdownData/data`, a trackdown-data clone next to this repository.

## The deploy workflow

`.github/workflows/deploy.yml` deploys every pull request to Preview and every push to `main` to Production. A newer push to a pull request cancels its running preview deploy; production deploys queue.

1. Checks out this repository, then trackdown-data's `main` into `.trackdown-data/` (Git-ignored, outside `public/`), only its `data/` folder. Both checkouts use `persist-credentials: false`, so no token is left in a `.git/config`.
2. Pins the deploy to that commit: its SHA becomes `TRACKDOWN_DATA_REF`. The step summary names it next to the deployment URL.
3. `bun install`, then `bun run data:check` on the checkout, which fails the deploy when a data file does not match the loader's schemas ([data.md](data.md#checking-the-data)), then `vercel pull`, `vercel build` (with `TRACKDOWN_DATA_DIR` and `TRACKDOWN_DATA_REF`), `bun run build:guard` on the checkout, which fails the deploy before anything is uploaded when any of the data is in `.vercel/output/static` ([data.md](data.md#the-build-guard)), and `vercel deploy --prebuilt`, with `--prod` on `main`. The Vercel CLI is the `vercel` dev dependency. Only `.vercel/output/` is uploaded.
4. The job runs in the GitHub environment `Preview` or `Production`, whose URL is the deployment, so a pull request links its preview.

It uses `pull_request`, never `pull_request_target`: a pull request from a fork gets no secrets, and neither does one from Dependabot. The job skips those instead of failing, so code from outside the repository never runs next to a secret. They still get the CI checks (`pr.yml`), which need no data.

What the repository needs, in its settings (Secrets and variables → Actions):

| Name | Kind | What it is |
| --- | --- | --- |
| `TRACKDOWN_DATA_TOKEN` | Secret | Fine-grained personal access token: resource owner `trackdown-app`, only the `trackdown-data` repository, permission Contents: read-only. |
| `VERCEL_TOKEN` | Secret | A Vercel access token scoped to `bram-gussekloos-projects`. |
| `VERCEL_ORG_ID` | Variable | The scope's ID (`orgId` in `.vercel/project.json` after `vercel link`). |
| `VERCEL_PROJECT_ID` | Variable | The project ID (`projectId` in the same file). |

Neither token is a Vercel environment variable: the data token stays in GitHub, and the build reads the data from the runner's disk.

## The Vercel project

The project is `trackdown-website` in Bram's personal Vercel scope, `bram-gussekloos-projects` (a Hobby account). Its URL is `trackdown-website.vercel.app`.

- **Git builds are off.** `vercel.json` sets `git.deploymentEnabled` to `false`, so a push does not make Vercel build. The repository stays connected to the project, which only labels deploys with their commit. Deploys come from the deploy workflow (above), which builds with `vercel build` and uploads the result with `vercel deploy --prebuilt`.
- **Deployment protection.** Vercel Authentication guards every deploy except those on a custom domain, so `trackdown-website.vercel.app` asks for a Vercel login until the site gets its own domain.
- **Environments.** Preview (every deploy without `--prod`) and Production (`--prod`). The server reads no runtime environment variables yet: the data and its ref are built in (above). A variable the server needs at runtime is added to both in the project's settings (or with `vercel env add <name> <environment>`) and listed here.
- **Region.** The function region comes from the build (see above), because a prebuilt deploy carries its own function config. `regions` in `vercel.json` sets the project's default to `fra1` as well, so the deploy's own region matches.

## A manual deploy

With the Vercel CLI (`bunx vercel`), logged in as the owner of the scope (`bunx vercel login`):

```bash
bunx vercel link --scope bram-gussekloos-projects --project trackdown-website
bunx vercel pull --environment=preview
TRACKDOWN_DATA_DIR=../TrackdownData/data TRACKDOWN_DATA_REF=$(git -C ../TrackdownData rev-parse HEAD) bunx vercel build
bunx vercel deploy --prebuilt
```

`vercel link` writes `.vercel/project.json`, which ties this checkout to the project. `vercel pull` fetches the environment's variables and project settings into `.vercel/`, which `vercel build` reads. For production: `vercel pull --environment=production`, `vercel build --prod`, `vercel deploy --prebuilt --prod`.
