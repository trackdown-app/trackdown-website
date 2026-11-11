# SEO and link previews

Every page describes itself to search engines and to the apps that preview a shared link: its title, description, canonical URL, the same page in the other language and a share image. A preview never gives the answer away: it names the puzzle's number, never a station. `src/lib/seo.ts` builds the tags; `src/lib/seo.test.ts` covers it.

## A page's tags

Every page route returns `seo()` from its `head()`:

```ts
export const Route = createFileRoute("/hoe-te-spelen")({
    head: ({ match }) =>
        seo({
            title: m["howToPlay.pageTitle"](),
            description: m["seo.howToPlayDescription"](),
            path: match.pathname,
        }),
    component: HowToPlayPage,
});
```

`path` is the route match's `pathname`, which has no locale prefix (the router's rewrite strips it, see [i18n.md](i18n.md#locale-routing)). An index route such as `/nl/archief/` keeps a trailing slash in it, which `seo()` drops. The locale defaults to the current one. Title and description are Paraglide messages, so each language gets its own. A route whose `head()` reads its loader's data sets `head` after `loader`, so the data keeps its type.

`seo()` returns:

- **Title** (the document's whole title, such as "Archief · Trackdown") and the meta description.
- **Canonical URL** on `https://trackdown.nl` in the page's language: `https://trackdown.nl/nl`, `https://trackdown.nl/en/nl`. It never carries the query string, and it points at that address whichever host serves the page (`siteOrigin`, `src/lib/site-origin.ts`).
- **Language alternates**: a `<link rel="alternate" hreflang>` for `nl`, `en` and `x-default` (the Dutch page, the base locale's). Both language versions list the same three (`languageAlternates()`).
- **Open Graph**: `og:site_name`, `og:type` `website`, `og:url`, `og:title`, `og:description`, `og:locale` (`nl_NL`, `en_GB`) with the other language as `og:locale:alternate`, and `og:image` with its alt text and size.
- **Twitter**: a `summary_large_image` card with the same title, description and image.

| Page | Title | Description |
| --- | --- | --- |
| A network's game, `/{network}` | `seo.gameTitle`: "Trackdown NL · Puzzel 142" | `seo.gameDescription`, with the number |
| The archive, `/{network}/archief` | `archive.pageTitle` | `seo.archiveDescription` |
| An archive puzzle, `/{network}/archief/{number}` | `archive.puzzlePageTitle` | `seo.archivePuzzleDescription`, with the number |
| How to play, `/hoe-te-spelen` | `howToPlay.pageTitle` | `seo.howToPlayDescription` |
| About, `/over` | `about.pageTitle` | `seo.aboutDescription` |
| Privacy policy, `/privacy` | `privacy.pageTitle` | `seo.privacyDescription` |
| Terms of use, `/voorwaarden` | `terms.pageTitle` | `seo.termsDescription` |

The game page's loader returns today's puzzle number for its head. The puzzle the loader reads (`todayPuzzle`) never carries the station, so the head cannot name it.

The root route (`src/routes/__root.tsx`) sets the defaults a page without `seo()` falls back on, such as the not-found and error pages: the title "Trackdown" and the site description (`seo.description`), without a canonical URL or alternates. `/` has no tags of its own: it redirects to a network's game ([network-picker.md](network-picker.md)).

`src/router.test.tsx` checks the rendered game page: its title and `og:title` with the puzzle number, the share image, the canonical URL, the English alternate and the favicon.

## Share image

Every page shares `public/og-image.png`: the logo's line mark and the "Trackdown" wordmark on the page background, with `trackdown.nl` below, 1200 by 630 pixels, the size Open Graph and Twitter crop to. It is the same in both languages and shows no puzzle, so it can never show an answer; the title carries the puzzle's number. Its alt text is `seo.imageAlt`.

## Icons

The root route links the site's icons, all in `public/` and drawn from the logo's line mark (`LogoMark`, [site-shell.md](site-shell.md#header)) in the answer plate's colours on an ink tile, so it reads on light and dark browser chrome:

| File | What for |
| --- | --- |
| `favicon.svg` | The tab icon in browsers that take SVG. The source of the others. |
| `favicon.ico` | 32 and 16 pixel PNGs, for browsers and tools that ask for `/favicon.ico`. |
| `apple-touch-icon.png` | 180 pixels, full bleed: iOS rounds the corners itself. |
| `icon-192.png`, `icon-512.png` | The web app manifest's icons. |
| `manifest.webmanifest` | Name, colours and icons for "Add to home screen". |

`theme-color` follows the page background: `#f6f7f5` in light mode, `#15181c` in dark mode.

The PNGs and the ICO are renders of `favicon.svg` (and of the share image's SVG) with [resvg](https://github.com/RazrFalcon/resvg) and the Barlow fonts' TTFs. After changing the mark, render them again at the sizes above.

## Sitemap and robots.txt

### iOS universal links

`public/.well-known/apple-app-site-association` associates `trackdown.nl` with
`CN495B7KTS.nl.trackdown.Trackdown` (the iOS app's Team ID and bundle identifier).
It allows `/nl`, `/gb`, `/en/*`, and both networks' archive indexes and puzzle
paths. Other Dutch pages remain web links. The English wildcard includes English
archive paths.

Nitro's exact route rule in `vite.config.ts` sets `Content-Type: application/json`
for this extensionless static file on Node and Vercel. Static serving bypasses
locale routing, so the HTTPS URL `/.well-known/apple-app-site-association` returns
the file directly without a redirect. Keep the identifiers in sync with the iOS
app's signing configuration and its `applinks:trackdown.nl` entitlement.

After deploying to production, check the origin and Apple's CDN:

```sh
curl -i https://trackdown.nl/.well-known/apple-app-site-association
curl -i https://app-site-association.cdn-apple.com/a/v1/trackdown.nl
```

Both must return HTTP 200 and the association JSON with the app identifier and
paths above; the origin must return `application/json` without a `Location`
header. A CDN error or stale response means verification is still pending.
Apple may take up to 24 hours to fetch the file. See Apple's
[associated domains guide](https://developer.apple.com/documentation/xcode/supporting-associated-domains)
and [universal link debugging guide](https://developer.apple.com/documentation/technotes/tn3155-debugging-universal-links).

### Sitemap

`/sitemap.xml` (`src/routes/sitemap[.]xml.ts`, `src/lib/sitemap.ts`) lists every network's game and archive, How to play, About, Privacy and Terms, in Dutch and in English: one `<url>` per page and language. Each lists the page's language versions as `xhtml:link` alternates, the same `nl`, `en` and `x-default` its head lists, from the same `languageAlternates()`. An archive's puzzles are not listed; the archive links to each. A new network is listed as soon as it joins `networkIds` ([network-picker.md](network-picker.md)).

### robots.txt

`/robots.txt` (`src/routes/robots[.]txt.ts`) lets every crawler read the pages, keeps it out of the REST API (`/api/`), the server functions the pages call (`/_serverFn/`) and the cookie banner's form (`/consent`), and points to `https://trackdown.nl/sitemap.xml`.

`robots.txt` stops a crawler reading the API, not a search engine listing a URL it found elsewhere. Every API answer, errors included, therefore carries `X-Robots-Tag: noindex` (`jsonResponse` in `src/lib/api/rest.ts`, [api.md](api.md)).

Previews and the `vercel.app` address sit behind Vercel Authentication ([deploy.md](deploy.md#the-vercel-project)), so crawlers never reach them.
