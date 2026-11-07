# Accessibility and performance

The game works with a keyboard and a screen reader and loads fast on a phone ([issue #43](https://github.com/trackdown-app/trackdown-website/issues/43)). This page lists the budgets, what keeps the site inside them, and the browser checks that watch them on every pull request.

## The budgets

- No axe violation of any impact (WCAG 2.2 A and AA rules) on the checked pages, in Dutch and English, in the light and the dark theme, on a phone and on a desktop. The cookie banner is up on every one of them, as on a first visit.
- Today's puzzle can be played to the end with the keyboard alone.
- Lighthouse on the game page (`/nl` and `/en/nl`), as a mid-range phone on slow 4G, median of three runs:

| Budget | Limit |
| --- | --- |
| Performance | 90 or more |
| Accessibility, Best practices, SEO | 100 |
| First Contentful Paint | 2.0s or less |
| Largest Contentful Paint | 2.5s or less |
| Cumulative Layout Shift | 0.1 or less |
| Total Blocking Time | 200ms or less |
| Scripts, compressed | 360 KB or less (PostHog's included, which loads after the page) |
| Fonts | 175 KB or less |
| Stylesheet | 12 KB or less |
| Document | 32 KB or less |
| Everything | 600 KB or less |

The byte budgets sit about a tenth above what the page downloads today, so a new dependency or font weight has to be a choice. Measured locally on the fixture's build: Performance 99 to 100, LCP 1.5 to 1.7s, CLS 0, TBT under 30ms, scripts about 326 KB and fonts 160 KB.

## The pages

`e2e/pages.ts` names the pages axe checks, each at its Dutch path and under `/en`:

- the game, `/nl`, while playing, and the same page once solved (`GameOver`, [game.md](game.md#solved-and-missed));
- How to play, `/hoe-te-spelen`;
- the archive, `/nl/archief`, and an archive puzzle, `/nl/archief/1`;
- About, Privacy and Terms (`/over`, `/privacy`, `/voorwaarden`);
- the not-found page, which answers 404.

A new page gets a line there in the same change.

## Keyboard

- The skip link is the first Tab on every page, with the site's focus ring, and jumps past the header ([site-shell.md](site-shell.md#skip-link)).
- The station search is the first stop inside the content. Typing opens the list, Enter picks the highlighted station and Enter again guesses it ([station-search.md](station-search.md#keyboard-and-screen-readers)); focus stays in the search for the next guess.
- The winning guess removes the search, so focus moves to the answer, the page's heading ([game.md](game.md#the-answer-comes-from-the-reveal)).
- The cookie banner is a region, not a modal: it never takes the first Tab or traps focus ([analytics.md](analytics.md#banner-and-settings)).

## Names that match what is shown

A control's accessible name starts with its visible text (WCAG 2.5.3), so a voice command such as "click Netherlands" finds it. The header's network pill is named by its own text, the network's name, followed by a visually hidden ". Change network" / ". Kies een netwerk"; the code chip beside the name is hidden from screen readers ([network-picker.md](network-picker.md#the-picker)). An `aria-label` that starts differently, as the pill had before, fails axe's `label-content-name-mismatch`.

## Fonts

- The root route preloads the Latin file of each Barlow weight the stylesheet imports (`src/lib/font-preloads.ts`), so the browser fetches them alongside the stylesheet instead of after it. Vite gives a preload the same hashed URL as the stylesheet's `@font-face`, so each file is fetched once.
- Until Barlow arrives the text is drawn in "Barlow Fallback" and "Barlow Condensed Fallback" (`src/styles.css`): Arial, or Liberation Sans or Roboto where Arial is missing, scaled with `size-adjust` to Barlow's width and given Barlow's ascent and descent, one face per weight. So the text keeps its place when Barlow swaps in. The values were measured in Chromium on a line of the site's own Dutch and English text; measure again when a weight is added.
- A fallback is never exactly as wide as Barlow, so a line that only just fits can still wrap differently when the font swaps. The header keeps 16px between the logo and the network pill on a phone (24px from `sm`), so both fit on one row from about 405px wide, with room to spare at the common 412px. Before that, the English pill wrapped under the logo at 412px once Barlow arrived and moved the page down by a row (a CLS of 0.23).

## Compression

On Vercel the CDN compresses the static files and the function's answers. The Node server (`bun run start`, and the browser checks) does not compress on its own, so a local build gets `compressPublicAssets` (`vite.config.ts`): Nitro writes a gzip and a brotli copy of every script, stylesheet and SVG and sends the one the browser accepts. A Vercel build leaves them out ([deploy.md](deploy.md#the-build)). Uncompressed, the game page's scripts were about a megabyte and its LCP 6.8s.

## The checks

Both run against the production build made from the committed fixture:

```bash
TRACKDOWN_DATA_DIR=fixtures/trackdown-data bun run build
bun run test:browser
bun run lighthouse
```

The server needs Node 24 or later, which runs the TypeScript clock shift below without a build step. Playwright needs its Chromium once: `bunx playwright install chromium`. Lighthouse finds Google Chrome itself; point `CHROME_PATH` at a Chrome or Chromium binary if it cannot.

### The clock

The fixture's puzzles are dated 18 to 22 June 2026, and today's puzzle is the one dated today. `e2e/clock.ts` works out how many whole days lie between today and 20 June; the checks move both clocks back by that much:

- **The server.** `node --import ./e2e/shift-server-clock.ts .output/server/index.mjs` loads `e2e/shift-server-clock.ts` before the server. It replaces `Date` with a proxy whose `new Date()` and `Date.now()` answer the shifted time; a date built from a value is left alone. It never ships with the site.
- **The browser.** The specs' `page` (`e2e/fixtures.ts`) installs Playwright's clock at the same shifted time, so the page, its countdown and the server agree on today's puzzle.

The time of day stays real, so a run near midnight lands on 19 or 21 June, which the fixture has too. The specs never assume a puzzle: `todayStations` (`e2e/play.ts`) reads the puzzle number from the page's title and looks up its mystery station in the fixture.

Lighthouse cannot move the browser's clock. On its runs the countdown has already passed zero and asks the server for today's puzzle every 10 seconds ([game.md](game.md#countdown)), which the budgets absorb.

### In a browser

`bun run test:browser`: Playwright (`playwright.config.ts`) starts the shifted server on port 3100 and runs every spec twice, as a phone (Pixel 7, with touch) and as a desktop, with reduced motion. Locally a server already on port 3100 is reused, so stop it after a new build. The server gets no PostHog token, so its telemetry stays on the console ([logging.md](logging.md)); the browser's requests to PostHog's proxy (`t.trackdown.nl`) are blocked, so a check never counts as a visit. `openPage` waits until the network is idle, so the page has hydrated before a key is pressed, and until the cookie banner shows.

- `e2e/accessibility.spec.ts` runs axe's WCAG 2.2 A and AA rules on every page in `e2e/pages.ts` in both languages, on the not-found page, and on the game once it is solved (a wrong guess, then the answer, both with the keyboard), each in the light and the dark theme. It fails on any violation.
- `e2e/keyboard.spec.ts` plays today's puzzle with the keyboard alone: the first Tab reaches the skip link, which shows the focus ring, Enter follows it, the next Tab reaches the station search, a wrong guess lands in the guess list with focus still in the search, and the winning guess moves focus to the answer's heading. It also checks the skip link's Dutch name.

### Lighthouse

`bun run lighthouse`: Lighthouse CI (`lighthouserc.yml`) starts the shifted server on port 3200 and runs Lighthouse three times on `/nl` and on `/en/nl`, as a phone on slow 4G with a 4x slower CPU, and asserts the [budgets](#the-budgets) on the median run. The reports go to `.lighthouseci/reports`, never to a public server.

- It throttles for real (`throttlingMethod: devtools`) rather than simulating. On localhost every script has arrived before the first paint, and Lighthouse's simulation then counts all of them into the largest paint: it reported an LCP of 3.6s for a page a throttled phone paints in 1.5s.
- A build that is not production asks search engines not to index it ([seo.md](seo.md)), so the `is-crawlable` audit is skipped.
- `blockedUrlPatterns` keeps Lighthouse off PostHog's proxy.

### In CI

The Build job in `.github/workflows/pr.yml` uploads its `.output` (the `nitro-output` artifact, kept a day). The Browser checks job downloads it, so the site is built once per run, sets up Node 24, caches Playwright's Chromium per Playwright version and installs the system libraries it needs from apt, runs `bun run test:browser` and then `bun run lighthouse` with the runner's Google Chrome, and uploads Playwright's failures and the Lighthouse reports as the `browser-checks` artifact. Lighthouse runs even when a Playwright check failed, so one run reports both.
