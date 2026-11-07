# Site shell

The parts every page shares: the skip link, the header and the footer, and the not-found and error pages. `RootDocument` (`src/components/layout/root-document.tsx`), the root route's `shellComponent` in `src/routes/__root.tsx`, renders them around each page, the not-found and error pages included. The page itself sits in `<div id="content">` between the header and the footer.

The design draws the shell on the Trackdown design canvas's Web · Playing board (header and footer with the legend) and Web · Privacy policy board (footer with the tagline). The header, the footer and every page's `main` share one column, `shellContainer` (`src/components/layout/shell-container.ts`): 1080px at most, centred, 24px on each side.

## Skip link

`SkipLink` (`src/components/layout/skip-link.tsx`) is the first thing the keyboard reaches on every page: "Naar de inhoud", or "Skip to content" on an English page (`header.skipToContent`). It stays visually hidden until it has focus, then shows over the header's top left corner as a filled ink button. It links to `#content` (`contentId`), so the next Tab after following it lands on the first control inside the page's `main`. shadcn/ui has no skip link, hence this one.

## Focus ring

Every focusable element shows the site-wide `:focus-visible` outline from `src/styles.css`: 3px solid in `--ring` (line 1, see [design-system.md](design-system.md#defaults-for-what-the-design-does-not-draw)), 3px off the element, for the keyboard only. The shadcn button (`src/components/ui/button.tsx`) drops shadcn's own focus ring for it, so every control shows the same focus. Components never remove the outline without a visible replacement.

## Header

`SiteHeader` (`src/components/layout/site-header.tsx`), in the order of the keyboard:

- **The logo**, linking home (a router `<Link to="/">`, so it points at `/en` on an English page): the line mark (`LogoMark`, `src/components/layout/logo-mark.tsx`, the Brand board's SVG drawn in the theme's tokens, so it follows dark mode) and the wordmark in Barlow Condensed 800. Its name starts with the visible "Trackdown" and says where it goes (`header.home`).
- **The network pill** (`NetworkPill`): an ink-bordered pill with an `NL` chip and "Nederland". The Netherlands is the only network, so the pill is a label for now, not a control, and the design's chevron is left out. Screen readers hear "Netwerk: Nederland". The network picker turns it into the button that opens the picker.
- **Archive and How to play** in a `<nav>` named `header.nav`. The current page carries `aria-current="page"` and shows underlined and semibold. Both have their route ([archive.md](archive.md), [how-to-play.md](how-to-play.md)), so both are a router `<Link>`. Archive is also the current page on every puzzle of the archive (`/archief/{number}`).
- **The statistics button**, a 44px icon button (Lucide's `ChartNoAxesColumn`) named `header.statistics`. It opens the statistics dialog, the player's record at today's network (`StatisticsDialog`, [statistics.md](statistics.md#the-dialog)).
- **The language switch** (`LanguageSwitch`, [i18n.md](i18n.md#language-switch)), which the design does not draw; it sits last.

Both halves of the header wrap. At phone width the network pill drops below the logo and the language switch below the links, so nothing scrolls sideways down to 320px. Every control is at least 44px high.

`src/components/layout/site-header.test.tsx` checks the links in both languages, `aria-current`, the pill's screen reader text, that the statistics button is an enabled dialog trigger and the language switch.

## Footer

`SiteFooter` (`src/components/layout/site-footer.tsx`) sits below a hairline (`rule`) in muted 15px text and holds:

- **The legend slot.** A route that names a component in `staticData.footerLegend` gets it here, such as the game page's `PlayingFooterLegend`: the line legend (`GameLegend`, [guess-list.md](guess-list.md#legend)) and, opposite it, the countdown to the next station (`NextPuzzleCountdown`, [game.md](game.md#countdown)). A legend may be a fragment of several parts; each is an item of the footer's wrapping row. The footer takes the deepest matched route's legend, so a child route can name its own. Without one, the footer shows the tagline (`footer.tagline`), as on the privacy board. With a legend, the links take a row of their own, as on the playing board. The type lives with the router's `Register` in `src/router.tsx`.
- **The links**: About, Privacy, Terms and Cookie settings, in a `<nav>` named `footer.nav`. The current page carries `aria-current="page"` and shows in ink, semibold. Each link is 44px high.

"Cookie settings" links to the privacy policy's part on cookies (`/privacy#cookies`, `cookieSettingsLink`) until the cookie banner exists; the banner's own button, which opens it again, then replaces the link.

```ts
export const Route = createFileRoute("/")({
    staticData: { footerLegend: PlayingFooterLegend },
    component: PlayPage,
});
```

`src/components/layout/site-footer.test.tsx` checks the links in both languages, `aria-current`, the tagline and that a route's legend replaces it.

## Page paths

`src/lib/site-paths.ts` holds the path of every page the shell links to, without a locale: `/archief`, `/hoe-te-spelen`, `/over`, `/privacy` and `/voorwaarden`. Paths are the same in both languages ([i18n.md](i18n.md#locale-routing)), so they are Dutch; `localizeHref` adds `/en` on an English page.

The home page, the archive and How to play have a route, and the shell links to them with a router `<Link>`. It links to the others with `PageLink` (`src/components/layout/page-link.tsx`), a plain `<a href={localizeHref(path)}>` that marks the current page with `aria-current`, rather than a typed `<Link>`. Until a page lands its link shows the not-found page. Switch a link to `<Link>` once its route exists, or keep `PageLink` and change the path here if the page takes another one.

## Not-found and error pages

`src/router.tsx` gives the router a default not-found and a default error component, so every route that sets none of its own shows them inside the shell:

- `NotFoundPage` (`src/components/errors/not-found-page.tsx`) for a URL no route matches and for a `notFound()` a route throws. The server answers it with HTTP 404. It links to today's puzzle.
- `ErrorPage` (`src/components/errors/error-page.tsx`) for an error a route's `beforeLoad` or loader throws. The server answers it with HTTP 500. The page shows a generic message, a button that loads the page again (`router.invalidate()`) and a link to today's puzzle; never the error itself. During the server render it logs the error to the server's console (`logRouteError`, `src/lib/log-route-error.ts`); in the browser that function does nothing.

The design draws neither page, so both use `ErrorLayout` (`src/components/errors/error-layout.tsx`), the playing board's title block: the status ("Fout 404", "Fout 500") where the board has the date, the condensed title and the lead, then the actions as 52px buttons. Their strings live under `notFound` and `error` in the message files.

The router still sends the error's message to the browser in its hydration data (a script after the page), for the error page it hydrates; the visible page never shows it. A route should not throw errors whose message is a secret.

A route that needs its own not-found or error page sets `notFoundComponent` or `errorComponent`.

`src/router.test.tsx` renders requests through the router's own SSR request handler (`createRequestHandler` from `@tanstack/react-router/ssr/server`): `/` answers 200 inside the header and footer, the archive's pages as [archive.md](archive.md#tests) lists, an unknown path 404 with the not-found page, and a route whose loader throws 500 with the error page and without the error's message in the visible page.

## Messages

Every label is a Paraglide message under `header`, `footer`, `notFound` and `error` in `messages/nl.json` and `messages/en.json`.
