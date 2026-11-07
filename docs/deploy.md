# Deploy

Vercel hosts the site and its API. TanStack Start reaches Vercel through Nitro, which writes Vercel's [Build Output API](https://vercel.com/docs/build-output-api) layout into `.vercel/output/` when it builds under `vercel build`.

## The build

`nitro()` in `vite.config.ts` sets no `preset`. Nitro picks one from the environment:

- Under `vercel build` (or on Vercel's builders) the `VERCEL` variable is set, so Nitro uses the `vercel` preset and writes `.vercel/output/`.
- Anywhere else, such as a local `bun run build` or CI's Build check, it uses the Node server preset and writes `.output/`, which `bun run start` runs ([getting-started.md](getting-started.md#scripts)).

`NITRO_PRESET=vercel bun run build` forces the `vercel` preset without the Vercel CLI, to look at the output.

`.vercel/output/` holds:

- `static/`: the client build (scripts, the stylesheet, the Barlow fonts) under `/assets/`, served by Vercel's CDN with `Cache-Control: public, max-age=31536000, immutable`, since every file name carries a content hash.
- `functions/__server.func/`: the Start server as one Node function. Every request that matches no static file goes to it, so every page renders on the server.
- `config.json`: the routes that send `/assets/*` to the CDN and the rest to the function.

The function runs in `fra1` (Frankfurt), the Vercel region closest to the Netherlands: `vercel.functions.regions` in the `nitro()` options, which only the `vercel` preset reads. Nitro writes it into the function's `.vc-config.json`.

`.vercel/` is ignored by Git: it holds the build output and the local project link from `vercel link`.

## The Vercel project

The project is `trackdown-website` in Bram's personal Vercel scope, `bram-gussekloos-projects` (a Hobby account). Its URL is `trackdown-website.vercel.app`.

- **Git builds are off.** `vercel.json` sets `git.deploymentEnabled` to `false`, so a push does not make Vercel build. The repository stays connected to the project, which only labels deploys with their commit. Deploys come from GitHub Actions, which build with `vercel build` and upload the result with `vercel deploy --prebuilt`.
- **Deployment protection.** Vercel Authentication guards every deploy except those on a custom domain, so `trackdown-website.vercel.app` asks for a Vercel login until the site gets its own domain.
- **Environments.** Preview (every deploy without `--prod`) and Production (`--prod`). The site reads no environment variables yet; a variable the server needs is added to both in the project's settings (or with `vercel env add <name> <environment>`) and listed here.
- **Region.** The function region comes from the build (see above), because a prebuilt deploy carries its own function config. `regions` in `vercel.json` sets the project's default to `fra1` as well, so the deploy's own region matches.

## A manual deploy

With the Vercel CLI (`bunx vercel`), logged in as the owner of the scope (`bunx vercel login`):

```bash
bunx vercel link --scope bram-gussekloos-projects --project trackdown-website
bunx vercel pull --environment=preview
bunx vercel build
bunx vercel deploy --prebuilt
```

`vercel link` writes `.vercel/project.json`, which ties this checkout to the project. `vercel pull` fetches the environment's variables and project settings into `.vercel/`, which `vercel build` reads. For production: `vercel pull --environment=production`, `vercel build --prod`, `vercel deploy --prebuilt --prod`.
