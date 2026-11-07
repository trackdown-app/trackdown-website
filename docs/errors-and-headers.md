# Security headers

Every response carries a set of security headers, and every page a Content-Security-Policy that allows only the site's own origin and the PostHog proxy. Implements [issue #44](https://github.com/trackdown-app/trackdown-website/issues/44), after SkoonHome's `src/lib/security-headers.ts`. The not-found and error pages are in [site-shell.md](site-shell.md#not-found-and-error-pages).

## The headers

`src/lib/security-headers.ts` holds them. `src/server.ts` sets them, through `withSecurityHeaders`, on every response the Start handler gives: pages, the API under `/api/v1`, server functions, the consent form at `/consent`, the sitemap and `robots.txt`. They replace any header of the same name a handler set itself; every other header (`Cache-Control`, `Location`, cookies) is kept.

| Header | Value |
| --- | --- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`. Browsers only honour it over https, so it does nothing on `http://localhost` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY`, the same as the policy's `frame-ancestors 'none'`, for the static files, which carry no policy |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera, geolocation, microphone, payment and USB switched off |
| `Content-Security-Policy` | See below. Not on static files |

### Static files

The files Vercel serves itself (`public/` and the built assets under `/assets/`) never reach `src/server.ts`. `vite.config.ts` gives them the same headers, without the policy, which only matters for documents: a route in the `vercel` preset's `config` (`.vercel/output/config.json`), `src: "/(.*)"` with `continue: true`, first in the list. It is not a Nitro route rule, because the preset writes those without `continue`, and a `/**` rule would then end routing before the request reached the server.

The local Node build (`bun run build`, `bun run start`) has no such route: its static files go without the headers. Pages and the API, which go through `src/server.ts`, carry them there too.

## Content-Security-Policy

`contentSecurityPolicy(nonce)` builds it:

| Directive | Sources |
| --- | --- |
| `default-src` | `'self'` |
| `script-src` | `'self'`, `'nonce-…'`, `https://t.trackdown.nl` |
| `style-src` | `'self'`, `'unsafe-inline'` |
| `img-src`, `font-src`, `frame-src` | `'self'` |
| `connect-src` | `'self'`, `https://t.trackdown.nl` |
| `object-src` | `'none'` |
| `base-uri`, `form-action` | `'self'` |
| `frame-ancestors` | `'none'` |

- **PostHog.** `https://t.trackdown.nl` is the managed proxy in front of PostHog's EU cloud (`posthogApiHost` in `src/lib/analytics/posthog-hosts.ts`, [analytics.md](analytics.md#posthog-project-and-proxy)). posthog-js sends events to it (`connect-src`) and loads its remote configuration from it as a script (`script-src`). Server telemetry to `eu.i.posthog.com` runs on the server and is not a browser request.
- **Styles.** `style-src` allows `'unsafe-inline'`: the trip line, the guess rows' time grid, the progress dots, the guess distribution and Base UI's hidden inputs carry `style` attributes the server renders, which the policy would otherwise block. Styles cannot run code, so scripts keep the strict rule.
- **Fonts and images** are the site's own: the Barlow fonts are bundled from `@fontsource`, the icons are in `public/`.
- **Forms.** The consent form posts to `/consent` and the cookie settings link is a GET form to the page itself, both `'self'`.

### The nonce

TanStack Start writes inline scripts into each page (the router's hydration data, scroll restoration) and `RootDocument` writes the theme initializer ([design-system.md](design-system.md#dark-mode)). They carry a nonce:

1. `src/server.ts` creates a fresh one for each request (`createCspNonce`, 128 random bits) and passes it to the Start handler as request context.
2. `getRouter()` (`src/router.tsx`) reads it with `getGlobalStartContext()` and sets the router's `ssr.nonce`. The router puts it on every inline script, on `ScriptOnce` (which the theme initializer uses) and in a `csp-nonce` meta tag.
3. In the browser, `getRouter()` reads it back from that meta tag, so the head it renders matches the server's.

Do not give a route an inline script (a `head().scripts` entry with `children`); give it a `src`. After hydration, TanStack Router looks for the server-rendered copy of an inline script by its `nonce` attribute, which the browser empties once a policy applies; it finds none, adds the script again and runs it twice. A raw `<script>` in a component would not get the nonce at all: use `ScriptOnce`.

### No eval

`script-src` has no `'unsafe-eval'`. The first time a page builds an object schema, Zod probes for it with `Function("")` to see whether it may compile a faster parser; the browser blocks the probe and logs a violation. `src/lib/zod.ts` turns on Zod's `jitless` option and re-exports `z`. Import `z` from `@/lib/zod`, never from `zod`; lint (`no-restricted-imports`) enforces it. Setting the option in one early import would not do, because the bundler runs shared chunks, where module-level schemas live, before the entry's own code.

### Development and Preview

- **Development.** `bun run dev` sends no policy, because Vite injects inline scripts of its own (the client, React Refresh) that cannot carry the nonce. The other headers are sent. Check the policy on a production build or a preview deployment.
- **Preview.** Vercel injects its toolbar into preview deployments for signed-in team members. When `VERCEL_ENV` is `preview`, the policy also allows the toolbar's hosts, from [Vercel's list](https://vercel.com/docs/vercel-toolbar/managing-toolbar#using-a-content-security-policy): `vercel.live` for scripts, styles, images, fonts, requests and frames, `vercel.com` for images, `assets.vercel.com` for fonts, `wss://ws-us3.pusher.com` for requests, and `data:` and `blob:` images. Production never names them.

### Adding an origin

To load something from another origin, add it to the matching directive in `contentSecurityPolicy()` and to `src/lib/security-headers.test.ts`, and say why here. A third party that receives visitor data also belongs in the privacy policy ([about-privacy-terms.md](about-privacy-terms.md)).

## Checking

- `src/lib/security-headers.test.ts` covers each header, the policy's directives, the Preview hosts, the nonce, and that a response keeps its status, body and other headers.
- `src/lib/zod.test.ts` checks that `z` from `@/lib/zod` is jitless and parses an object schema without calling `Function`.
- `src/router.test.tsx` renders the game page with a nonce in the Start context and checks that every inline script and the `csp-nonce` meta tag carry it.
- In a browser, on the preview: play a game with the console open (no `Content-Security-Policy` errors), and run the preview URL through [securityheaders.com](https://securityheaders.com) (grade A or better). `'unsafe-inline'` in `style-src` shows as a warning, not a missing header.
