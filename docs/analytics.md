# Analytics and cookie consent

The consent banner implements issue #39 and browser PostHog analytics implements [issue #40](https://github.com/trackdown-app/trackdown-website/issues/40). Pageviews are cookieless before an answer and after a refusal; acceptance enables a host-only PostHog cookie. Existing server logs and traces are independent of browser consent ([logging.md](logging.md)). The English copy matches the supplied Web · Cookie banner canvas and its description of PostHog agrees with the privacy policy at `/privacy` ([about-privacy-terms.md](about-privacy-terms.md)). A change to what is collected, stored or sent where changes that page in the same change.

## Banner and settings

`CookieBanner` (`src/components/consent/cookie-banner.tsx`) renders once in `RootDocument`, including on not-found and error pages. The first visit shows a card over the bottom of the page with the privacy policy link. Light and dark modes use the site's tokens. It is a named region, not a modal: playing remains possible and focus is not trapped. The card scrolls on short viewports. Decline comes first; both choices have the same 52px outline style and equal widths, side by side. This follows the issue's equal-weight requirement rather than the canvas's filled Accept button. NL and EN copy lives under `consent` in the message files.

The root loader fills `consentQueryOptions` through `getConsentFn` before rendering and hands its answer to the document. The browser hydrates from the same answer. Missing, invalid or outdated consent shows the banner; an accepted or declined answer shows the canvas's status line and a Cookie settings button. The confirmation disappears five seconds after hydration, leaving the footer's Cookie settings button available. The unanswered banner and explicitly reopened settings do not time out. Without JavaScript, the confirmation remains visible. Every server render has its own query cache. Pages and the server function answer with `Cache-Control: private, no-store`, keeping one visitor's answer out of shared caches.

Both choices submit native forms, even after hydration: `answer=accept` or `answer=decline` and `return=<current path and query>` go to `POST /consent`. Success sets the consent cookie and returns HTTP 303 to the same localized page and query with `#cookie-status`, focusing the status. Reloading preserves saved games and statistics in local storage.

`CookieSettingsButton` (`src/components/consent/cookie-settings-button.tsx`) appears in the footer on every page and beside the status. A native GET keeps the current localized page and existing query parameters, adds `cookie-settings=open`, and targets `#cookie-title`. The page shows the banner again and the fragment focuses its title. Choosing and reopening work before hydration and without JavaScript. Reopening does not change consent. Answering removes the settings parameter from the return URL, preventing an immediate reopening. Footer padding leaves room for the fixed status on phones.

The POST accepts `Sec-Fetch-Site: same-origin`, or, without that header, an `Origin` matching the request's origin. Cross-site, same-site and unverifiable submissions get 403. Unreadable forms and unknown answers get 400. Those responses never set cookies. Redirects accept only local paths; external, protocol-relative, backslash and control-character destinations fall back to `/`. All POST responses are uncacheable. Consent values, cookies and form bodies are never logged.

## Consent cookie

`src/lib/analytics/consent.ts` defines the shared contract. The strictly necessary `trackdown-consent` cookie holds URL-encoded JSON:

| Field | Value |
| --- | --- |
| `choice` | `{ "analytics": true }` after Accept, `{ "analytics": false }` after Decline |
| `version` | `CONSENT_TEXT_VERSION`, currently `1` |
| `givenAt` | ISO timestamp set by the server when the choice is submitted |

The cookie is host-only, has `Path=/`, `HttpOnly`, `SameSite=Lax` and a one-year `Max-Age` (`31536000` seconds). It is `Secure` outside Vite development. No cookie is set merely by visiting or reopening settings. The only other cookie the site sets itself is `trackdown-network`, the network a visitor picked in the network picker, set only when they pick one ([network-picker.md](network-picker.md#keeping-the-choice)). Missing and invalid records, and records from another text version, mean no consent (`null`). Raise `CONSENT_TEXT_VERSION` whenever the banner's wording or what acceptance allows changes.

The browser receives only `ConsentChoice | null` through the loader; it does not read the HTTP-only cookie. Browser analytics uses `choice.analytics === true` as the only permission for cookie persistence; `null` and `false` mean cookieless operation. Withdrawing uses the same Decline form and replaces the record with `false`. The next document removes old PostHog persistence before starting the SDK. Marketing consent and advertising trackers are outside this contract.

## Browser analytics

`BrowserAnalytics` (`src/components/consent/browser-analytics.tsx`) runs in `RootDocument`, including not-found and error pages. Its effect starts `src/lib/analytics/posthog-client.ts` after hydration. The `posthog-js` SDK is dynamically imported into a separate chunk; server rendering never initializes it. A document-wide promise prevents duplicate initialization, including React StrictMode. A failed import can be retried, and analytics failures never interrupt the game.

The native consent forms always reload the document, so the SDK mode is chosen once, before initialization. Without acceptance it uses `cookieless_mode: "always"` and disables persistence. Before the import, cleanup deletes this project's host-only `ph_<project-token>_posthog` cookie and `ph_<project-token>_*` keys in both local and session storage. This covers withdrawal, an expired consent cookie, and a changed consent text version, even if the SDK cannot load. Other storage, including saved games and the necessary consent cookie, is preserved. Each storage backend is cleaned independently if the other is unavailable.

With acceptance, `persistence: "cookie"` keeps the anonymous identity in a host-only PostHog cookie, secure on HTTPS, with the SDK's one-year expiry. Session bookkeeping may also use session storage after acceptance. No person profiles are created and the site never calls `identify`. The PostHog cookie is distinct from the HTTP-only consent cookie.

The SDK sends the initial `$pageview` and subsequent History API pageviews, including localized navigation, plus `$pageleave` events. Interaction autocapture is enabled: clicks, form changes and form submissions produce `$autocapture` events. Before acceptance and after refusal, their DOM text, attributes and element chains are removed, following SkoonHome's cookieless handling. After acceptance those element details make interactions recognizable in PostHog; the SDK still excludes sensitive input values. All events retain the same consent properties and persistence rules. Dead clicks, exceptions, heatmaps, performance capture, session replay, surveys, product tours, conversations and feature-flag requests remain disabled. Explicit game events are listed below. URL queries and fragments are removed from event properties, including nested URLs, and `$ip` is set to `null`.

Every event receives these properties through `before_send`, including the first pageview:

| Property | Value |
| --- | --- |
| `environment` | Vite mode (`development` locally, `production` for built previews and production) |
| `consent_analytics` | `null` before an answer, `true` after acceptance, `false` after refusal |
| `consent_marketing` | Always `false`; Trackdown offers no marketing consent |
| `consent_version` | Current `CONSENT_TEXT_VERSION` |

These consent property names match SkoonHome's integration. The public PostHog project ingestion token and `https://t.trackdown.nl` live in `posthog-client.ts`; no browser environment variable is needed. The ingestion key is intentionally public, unlike a personal API key. Server telemetry continues reading its own runtime `POSTHOG_PROJECT_TOKEN`; it is not copied into the client by Vite.

## Game events

[Issue #41](https://github.com/trackdown-app/trackdown-website/issues/41) adds the typed event list in `src/lib/analytics/events.ts`, following SkoonHome's `AnalyticsEventProperties` map. Call sites use `trackEvent` in `posthog-client.ts`. Each event includes `network` (currently `nl`), `puzzle_number` and `archive` (a boolean), plus the environment and consent properties above.

| Event | Trigger | Additional properties |
| --- | --- | --- |
| `puzzle_started` | The first successful guess in a game with no saved guesses | None |
| `guess_made` | A successful guess is saved | `guess_number`: the one-based number of the saved guess |
| `puzzle_solved` | A successful guess wins the game | `guesses_used`: the total number of saved guesses |
| `puzzle_missed` | The last allowed guess is saved without a win | `guesses_used`: the total number of saved guesses |
| `result_shared` | The Web Share API resolves successfully, or the clipboard copy succeeds | `method`: `shared` or `copied` |
| `archive_puzzle_played` | The first successful guess made through the archive, including a resumed daily game | None |

`useGame` emits events after saving a successful server answer, not when the player opens a puzzle, types, submits a pending request or receives an error. A first guess emits `puzzle_started`, then `archive_puzzle_played` if applicable, then `guess_made`, and finally the outcome if the game ends. A resumed game emits no new start. Reading saved games, rerendering, StrictMode and another tab's storage updates do not replay events. Duplicate responses and responses arriving after another tab finishes the game are ignored. The saved archive mark prevents repeating `archive_puzzle_played` on later guesses or reloads; game events keep `archive: true` once that mark is set.

`ShareButton` receives puzzle metadata separately from the share text. Each successful share or copy emits `result_shared`; closing the share sheet or failing both methods emits nothing. Its `archive` field describes the page where the result was shared.

Game properties never include the mystery station, guessed station names or codes, change stations, trips, typed text or share text. `trackEvent` copies only the documented fields before capture, stripping extra fields even when a structurally compatible object carries station data. Events use the existing SDK and its consent mode, including cookieless capture before an answer and after refusal. Calls during SDK startup wait for that document's initialization; calls before startup are dropped without loading the SDK or choosing consent. Initialization and capture failures are swallowed, so analytics cannot interrupt play. There is no persistent event queue or new storage key. Clearing saved games also clears the local evidence used to prevent repeat starts and archive events.

## PostHog project and proxy

`t.trackdown.nl` is the managed reverse proxy for the EU cloud. Its CNAME targets the provisioned `*.cf-prod-eu-proxy.europehog.com` host. The SDK uses `api_host: "https://t.trackdown.nl"` for ingestion and assets, and `ui_host: "https://eu.posthog.com"` for PostHog links. Its root may redirect to the website; `/static/array.js` must serve JavaScript and ingestion paths must reach PostHog. No application proxy route is needed. See PostHog's [managed proxy guide](https://posthog.com/docs/advanced/proxy).

In PostHog's project settings, enable **Web analytics → Enable cookieless tracking** before deployment; PostHog otherwise discards cookieless events. Confirm **General → IP data capture** discards client IP data. The browser's `$ip: null` does not replace that project setting. See [PostHog's data collection guide](https://posthog.com/docs/privacy/data-collection). These project settings cannot be verified or changed with the public ingestion token.

## Verification

`src/lib/analytics/consent.test.ts` checks records and text versions, native POSTs, cookie attributes, origin guards, invalid forms and safe redirects. `cookie-banner.test.tsx` checks server-rendered NL/EN copy, equal button classes and order, localized return paths, statuses and settings forms. `cookie-banner-lifecycle.test.tsx` checks that both confirmations disappear after five seconds while unanswered and reopened settings stay visible. Router tests check first visits, both saved choices, settings reopening, private caching and no initial cookie. Footer tests cover both locales.

`src/lib/analytics/posthog-client.test.ts` exercises the real SDK with intercepted fetch and beacon transport: first and client-navigation pageviews without cookies or storage, automatic clicks, form changes, submissions and pageleave for all consent states, accepted cookie identity across initialization, cleanup after withdrawal or missing consent, independent storage failures, consent properties, and URL/IP filtering. The interaction tests verify that typed values are excluded and cookieless events omit DOM text. Tests send no events to PostHog.

The same real-SDK tests check all six game events in every consent state. `posthog-start.test.ts` checks waiting for startup, removing extra station fields, avoiding initialization before consent is supplied, and isolating SDK failures. `game-page.test.tsx` checks first and resumed games, new and resumed archive games, wins and losses, reloads, duplicate responses, failed guesses, successful shares and copies, cancelled sharing and failed copies. Its exact payload assertions exclude station names and codes.

Run `bun run typecheck`, `bun run lint`, `bun run test` and `bun run build`. Browser checks are manual: test first visit, both choices, refresh, footer reopening and withdrawal in both themes and languages, then repeat without JavaScript. Check phone widths, short viewports and keyboard focus at the title and status. In browser developer tools, verify no `ph_*` cookie or storage before acceptance, the host-only PostHog cookie after acceptance, and removal after refusal. Navigate between NL and EN pages, click controls and submit forms, and confirm pageviews, pageleave, interactions and consent properties in PostHog through `t.trackdown.nl`. Confirm cookieless interactions omit DOM details and accepted interactions have useful element labels without typed input values. With JavaScript disabled, consent still works and browser analytics does not run.
