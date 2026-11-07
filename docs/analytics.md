# Analytics and cookie consent

The consent banner implements issue #39. Browser analytics belongs to [issue #40](https://github.com/trackdown-app/trackdown-website/issues/40): no browser PostHog SDK or analytics cookie is added here. Existing server logs and traces are independent of browser consent ([logging.md](logging.md)). The English copy matches the supplied Web · Cookie banner canvas and its description of PostHog agrees with the privacy policy canvas for [issue #45](https://github.com/trackdown-app/trackdown-website/issues/45).

## Banner and settings

`CookieBanner` (`src/components/consent/cookie-banner.tsx`) renders once in `RootDocument`, including on not-found and error pages. The first visit shows a card over the bottom of the page with the privacy policy link. Light and dark modes use the site's tokens. It is a named region, not a modal: playing remains possible and focus is not trapped. The card scrolls on short viewports. Decline comes first; both choices have the same 52px outline style and equal widths, side by side. This follows the issue's equal-weight requirement rather than the canvas's filled Accept button. NL and EN copy lives under `consent` in the message files.

The root loader fills `consentQueryOptions` through `getConsentFn` before rendering and hands its answer to the document. The browser hydrates from the same answer. Missing, invalid or outdated consent shows the banner; an accepted or declined answer shows the canvas's status line and a Cookie settings button. The confirmation disappears five seconds after hydration, leaving the footer's Cookie settings button available. The unanswered banner and explicitly reopened settings do not time out. Without JavaScript, the confirmation remains visible. Every server render has its own query cache. Pages and the server function answer with `Cache-Control: private, no-store`, keeping one visitor's answer out of shared caches.

Both choices submit native forms, even after hydration: `answer=accept` or `answer=decline` and `return=<current path and query>` go to `POST /consent`. Success sets the consent cookie and returns HTTP 303 to the same localized page and query with `#cookie-status`, focusing the status. Reloading preserves saved games and statistics in local storage.

`CookieSettingsButton` (`src/components/consent/cookie-settings-button.tsx`) appears in the footer on every page and beside the status. A native GET keeps the current localized page and existing query parameters, adds `cookie-settings=open`, and targets `#cookie-title`. The page shows the banner again and the fragment focuses its title. Choosing and reopening work before hydration and without JavaScript. Reopening does not change consent. Answering removes the settings parameter from the return URL, preventing an immediate reopening. Footer padding leaves room for the fixed status on phones.

The POST accepts `Sec-Fetch-Site: same-origin`, or, without that header, an `Origin` matching the request's origin. Cross-site, same-site and unverifiable submissions get 403. Unreadable forms and unknown answers get 400. Those responses never set cookies. Redirects accept only local paths; external, protocol-relative, backslash and control-character destinations fall back to `/`. All POST responses are uncacheable. Consent values, cookies and form bodies are never logged.

## Consent cookie

`src/lib/analytics/consent.ts` defines the shared contract for #40. The strictly necessary `trackdown-consent` cookie holds URL-encoded JSON:

| Field | Value |
| --- | --- |
| `choice` | `{ "analytics": true }` after Accept, `{ "analytics": false }` after Decline |
| `version` | `CONSENT_TEXT_VERSION`, currently `1` |
| `givenAt` | ISO timestamp set by the server when the choice is submitted |

The cookie is host-only, has `Path=/`, `HttpOnly`, `SameSite=Lax` and a one-year `Max-Age` (`31536000` seconds). It is `Secure` outside Vite development. No cookie is set merely by visiting or reopening settings. Missing and invalid records, and records from another text version, mean no consent (`null`). Raise `CONSENT_TEXT_VERSION` whenever the banner's wording or what acceptance allows changes.

The browser receives only `ConsentChoice | null` through the loader; it does not read the HTTP-only cookie. Browser analytics must use `choice.analytics === true` as the only permission for cookie persistence; `null` and `false` mean cookieless operation. Withdrawing uses the same Decline form and replaces the record with `false`. Issue #40 must remove old PostHog persistence when it reads that answer. Marketing consent and advertising trackers are outside this contract.

## Verification

`src/lib/analytics/consent.test.ts` checks records and text versions, native POSTs, cookie attributes, origin guards, invalid forms and safe redirects. `cookie-banner.test.tsx` checks server-rendered NL/EN copy, equal button classes and order, localized return paths, statuses and settings forms. `cookie-banner-lifecycle.test.tsx` checks that both confirmations disappear after five seconds while unanswered and reopened settings stay visible. Router tests check first visits, both saved choices, settings reopening, private caching and no initial cookie. Footer tests cover both locales.

Run `bun run typecheck`, `bun run lint`, `bun run test` and `bun run build`. Browser checks are manual: test first visit, both choices, refresh, footer reopening and withdrawal in both themes and languages, then repeat without JavaScript. Check phone widths, short viewports and keyboard focus at the title and status. PostHog event delivery and persistence switching await #40; the privacy route awaits #45.
