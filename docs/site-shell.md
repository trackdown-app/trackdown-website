# Site shell

The parts every page shares: the skip link, the header and the footer, the cookie consent banner, and the not-found and error pages. `RootDocument` (`src/components/layout/root-document.tsx`), the root route's `shellComponent` in `src/routes/__root.tsx`, renders them around each page, the not-found and error pages included. The page itself sits in `<div id="content">` between the header and the footer. The root loader reads consent for the server-rendered banner or status. Pages are private and uncacheable ([analytics.md](analytics.md)).

The design draws the shell on the Trackdown design canvas's Web · Playing board (header and footer with the legend) and Web · Privacy policy board (footer with the tagline). The header, the footer and every page's `main` share one column, `shellContainer` (`src/components/layout/shell-container.ts`): 1080px at most, centred, 24px on each side.

## Skip link

`SkipLink` (`src/components/layout/skip-link.tsx`) is the first thing the keyboard reaches on every page: "Naar de inhoud", or "Skip to content" on an English page (`header.skipToContent`). It stays visually hidden until it has focus, then shows over the header's top left corner as a filled ink button. It links to `#content` (`contentId`), so the next Tab after following it lands on the first control inside the page's `main`. shadcn/ui has no skip link, hence this one.

## Focus ring

Every focusable element shows the site-wide `:focus-visible` outline from `src/styles.css`: 3px solid in `--ring` (line 1, see [design-system.md](design-system.md#defaults-for-what-the-design-does-not-draw)), 3px off the element, for the keyboard only. The shadcn button (`src/components/ui/button.tsx`) drops shadcn's own focus ring for it, so every control shows the same focus. Components never remove the outline without a visible replacement.

## Header

`SiteHeader` (`src/components/layout/site-header.tsx`), in the order of the keyboard:

- **The logo**, linking to the current network's game (a router `<Link to="/$network">`, so it points at `/nl`, or `/en/nl` on an English page; the network from `useCurrentNetwork`, [network-picker.md](network-picker.md#keeping-the-choice)): the line mark (`LogoMark`, `src/components/layout/logo-mark.tsx`, the Brand board's SVG drawn in the theme's tokens, so it follows dark mode) and the wordmark in Barlow Condensed 800. Its name starts with the visible "Trackdown" and says where it goes (`header.home`).
- **The network pill** (`NetworkPicker`): an ink-bordered pill with the network's code chip, its name and a chevron, the button that opens the network picker ([network-picker.md](network-picker.md#the-picker)). Screen readers hear "Nederland. Kies een netwerk": the name it shows first ([accessibility.md](accessibility.md#names-that-match-what-is-shown)).
- **Archive and How to play** in a `<nav>` named `header.nav`. The current page carries `aria-current="page"` and shows underlined and semibold. Both have their route ([archive.md](archive.md), [how-to-play.md](how-to-play.md)), so both are a router `<Link>`. Archive is the current network's (`/{network}/archief`), and the current page on every puzzle of it too (`/{network}/archief/{number}`).
- **The statistics button**, a 44px icon button (Lucide's `ChartNoAxesColumn`) named `header.statistics`. It opens the statistics dialog, the player's record at today's network (`StatisticsDialog`, [statistics.md](statistics.md#the-dialog)).
- **The theme toggle** (`ThemeToggle`), a 44px shadcn icon button beside Statistics. Its stable accessible name is “Dark mode” / “Donkere modus”; `aria-pressed` tells whether dark mode is active. Moon and sun icons follow the resolved theme. Click, Enter or Space switches to the opposite theme and saves the override ([design-system.md](design-system.md#dark-mode)). The design does not draw this control, so it reuses the statistics button’s shape, spacing and tokens.
- **The language switch** (`LanguageSwitch`, [i18n.md](i18n.md#language-switch)), which the design does not draw; it sits last.

Both halves of the header wrap. At phone width the language switch drops below the links, and below about 405px the network pill drops below the logo, so nothing scrolls sideways down to 320px. The logo and the pill sit 16px apart on a phone and 24px from `sm`, so the common 412px phone keeps them on one row whether Barlow or its fallback is drawn ([accessibility.md](accessibility.md#fonts)). Every control is at least 44px high.

`src/components/layout/site-header.test.tsx` checks the links in both languages, `aria-current`, the pill's name in both languages, that the statistics button is an enabled dialog trigger and the language switch.

## Footer

`SiteFooter` (`src/components/layout/site-footer.tsx`) sits below a hairline (`rule`) in muted 15px text and holds:

- **The legend slot.** A route that names a component in `staticData.footerLegend` gets it here, such as the game page's `PlayingFooterLegend`: the line legend (`GameLegend`, [guess-list.md](guess-list.md#legend)) and, opposite it, the countdown to the next station (`NextPuzzleCountdown`, [game.md](game.md#countdown)). A legend may be a fragment of several parts; each is an item of the footer's wrapping row. The footer takes the deepest matched route's legend, so a child route can name its own. Without one, the footer shows the tagline (`footer.tagline`), as on the privacy board. With a legend, the links take a row of their own, as on the playing board. The type lives with the router's `Register` in `src/router.tsx`.
- **The links**: About, Privacy and Terms, plus a Cookie settings button, in a `<nav>` named `footer.nav`. The current page link carries `aria-current="page"` and shows in ink, semibold. Each control is at least 44px high.

"Cookie settings" submits a GET to the current localized page with `cookie-settings=open#cookie-title`, reopening the banner even without JavaScript ([analytics.md](analytics.md#banner-and-settings)). Footer padding leaves room for the fixed consent status.

```ts
export const Route = createFileRoute("/")({
    staticData: { footerLegend: PlayingFooterLegend },
    component: PlayPage,
});
```

`src/components/layout/site-footer.test.tsx` checks the links in both languages, `aria-current`, the tagline and that a route's legend replaces it.

## Page paths

`src/lib/site-paths.ts` holds the path of every page the shell links to, without a locale: `/`, `/hoe-te-spelen`, `/over`, `/privacy` and `/voorwaarden`, and `networkArchivePath` for a network's archive (`/{network}/archief`), for a link outside a router, such as the sitemap's or the cookie banner's. Paths are the same in both languages ([i18n.md](i18n.md#locale-routing)), so they are Dutch; `localizeHref` adds `/en` on an English page.

Every one of these pages has a route, and the header and footer link to it with a typed router `<Link>`, which marks the current page with `aria-current="page"`. About, Privacy and Terms are in [about-privacy-terms.md](about-privacy-terms.md).

## Not-found and error pages

`src/router.tsx` gives the router a default not-found and a default error component, so every route that sets none of its own shows them inside the shell:

- `NotFoundPage` (`src/components/errors/not-found-page.tsx`) for a URL no route matches and for a `notFound()` a route throws. The server answers it with HTTP 404. It links to today's puzzle.
- `ErrorPage` (`src/components/errors/error-page.tsx`) for an error a route's `beforeLoad` or loader throws. The server answers it with HTTP 500. The page shows a generic message, a button that loads the page again (`router.invalidate()`) and a link to today's puzzle; never the error itself. During the server render it logs the error to the server's console (`logRouteError`, `src/lib/log-route-error.ts`); in the browser that function does nothing.

The design draws neither page, so both use `ErrorLayout` (`src/components/errors/error-layout.tsx`), the playing board's title block: the status ("Fout 404", "Fout 500") where the board has the date, the condensed title and the lead, then the actions as 52px buttons. Their strings live under `notFound` and `error` in the message files.

The router still sends the error's message to the browser in its hydration data (a script after the page), for the error page it hydrates; the visible page never shows it. A route should not throw errors whose message is a secret.

A route that needs its own not-found or error page sets `notFoundComponent` or `errorComponent`.

`src/router.test.tsx` renders requests through the router's own SSR request handler (`createRequestHandler` from `@tanstack/react-router/ssr/server`): `/` redirects to `/nl`, `/nl` answers 200 inside the header and footer, a network the game has no data for 404 ([network-picker.md](network-picker.md#tests)), the archive's pages as [archive.md](archive.md#tests) lists, an unknown path 404 with the not-found page, and a route whose loader throws 500 with the error page and without the error's message in the visible page.

## Messages

Every label is a Paraglide message under `header`, `footer`, `notFound` and `error` in `messages/nl.json` and `messages/en.json`.
