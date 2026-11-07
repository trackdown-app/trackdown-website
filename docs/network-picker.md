# Network picker

Trackdown is built for more rail networks than the Netherlands. Each network has its own pages, its own daily station and its own kept games; the header's network pill opens a picker to choose one, and the choice is kept for the next visit. Only the Netherlands (`nl`) has data now, so the picker lists the others as coming later.

## Routes

Every page of a network sits under its id, in both languages ([i18n.md](i18n.md#locale-routing)):

| Path | Route | Page |
| --- | --- | --- |
| `/{network}` (`/en/{network}`) | `src/routes/$network/index.tsx` | Today's game ([game.md](game.md)) |
| `/{network}/archief` | `src/routes/$network/archief/index.tsx` | The archive ([archive.md](archive.md)) |
| `/{network}/archief/{number}` | `src/routes/$network/archief/$number.tsx` | An earlier puzzle |

`src/routes/$network/route.tsx` is their layout. Its `beforeLoad` checks the id against `networkIdSchema` and puts the parsed `NetworkId` in the route's context as `network`, which the loaders and components below read; an id the game has no data for (`/be`, `/NL`, `/geen-station`) throws `notFound()` and the server answers 404. Pages that are not a network's, such as How to play, keep their own path.

`/` (`/en`) has no page of its own: `src/routes/index.tsx` redirects (307) to `/{network}` of the visitor's chosen network, or of `defaultNetwork` (`nl`) when they have not chosen one.

The API already carries the network in its paths, `/api/v1/{network}/…` ([api.md](api.md)).

Paraglide's default URL patterns read a leading `/nl` as the Dutch locale's prefix and strip it, which would take the Dutch network's pages. `paraglide.config.ts` therefore lists the patterns itself: only `/en` is a locale prefix ([i18n.md](i18n.md#locale-routing)).

## Keeping the choice

The choice lives in the `trackdown-network` cookie (`src/lib/network-choice.ts`): the network's id, `Path=/`, a year (`Max-Age`), `SameSite=Lax`, `Secure` over HTTPS. A cookie rather than `localStorage`, because the server reads it to answer `/` with the right redirect. It is set only when the visitor picks a network in the picker, before the navigation: a preference they asked for, so it needs no consent, and merely visiting a page sets no cookie, as the consent contract promises ([analytics.md](analytics.md#consent-cookie)). Following a link to another network's page plays that network without changing the choice.

`readNetworkChoice`, a `createIsomorphicFn`, reads it from the request's `Cookie` header in the server render and from `document.cookie` in the browser; a value that is not a network the game has reads as no choice. The root route's `beforeLoad` puts the result, or `defaultNetwork`, in every route's context as `chosenNetwork`.

`useCurrentNetwork` (`src/lib/use-current-network.ts`) is the network the shell shows: the page's own on a network's page, else `chosenNetwork`. The header's logo and Archive link and the footer's countdown use it.

## The picker

`NetworkPicker` (`src/components/layout/network-picker.tsx`) follows the design's Web · Playing board for the pill and the iOS · Choose network board for the list.

- **The pill** is a Base UI popover trigger: an ink-bordered pill, 44px high, with the network's code chip (`NetworkChip`), its name and a chevron. Screen readers hear "Netwerk: Nederland. Kies een netwerk" / "Network: Netherlands. Change network", with the popover's `aria-expanded`.
- **The popup** (`PopoverContent`, shadcn/ui's popover dressed as the design's plates: surface, ink border, 16px corners, the popover shadow) opens below the pill, at most 22rem wide and never wider than the screen less 16px on each side. Its title, "Netwerken" / "Networks", names the dialog; a lead says each network has its own daily station.
- **To play** lists every network in `networks`: its chip in ink, its name in Barlow Condensed and, on the current one, the design's check in `line-1` with "Gekozen" / "Chosen" for screen readers. Each row links to the network's game; the router marks the current network's link `aria-current="page"`. Following one keeps it as the choice and closes the popup.
- **Coming next** lists `upcomingNetworks` with soft chips and "Komt later" / "Coming later". They are not links. The design's "Notify me" buttons, network search and "Suggest a network" link are left out: there is nothing behind them yet.

A network's name is its country's, from the runtime's own region names (`regionName` in `src/lib/data/networks.ts`, `Intl.DisplayNames`; `networkName` in `src/lib/game/network-name.ts` for a network): "Nederland" and "Netherlands", "België" and "Belgium", so a new network needs no message. `gb`'s region is `GB`, which the runtime names "Verenigd Koninkrijk" / "United Kingdom", though its data covers Great Britain only (Northern Ireland's railway is not in Network Rail's timetable).

## Adding a network

1. Its data folder in trackdown-data ([data.md](data.md#files)).
2. Its entry in `src/lib/data/networks.ts`: its id in `networkIdSchema`, its `networks` entry (`dataDir`, `region`), and its region out of `upcomingNetworks`.

Nothing else: the routes, the picker, the API and the kept games all go by the registry.

## Messages

The pill's strings are `header.network` and `header.changeNetwork`; the popup's live under `networkPicker`. The share text's link names the network too (`share.url`, [share.md](share.md#the-text)).

## Tests

- `src/components/layout/network-picker.test.tsx` opens the picker in `happy-dom`: the current network chosen and linked, the networks to come not linked, and picking one keeping it in the cookie, going to its game and closing the popup.
- `src/lib/network-choice.test.ts` reads the cookie among others, ignores a network the game does not have, and reads back what `keepNetworkChoice` wrote.
- `src/components/layout/site-header.test.tsx` checks the pill's name in both languages and the network's links.
- `src/router.test.tsx` sends `/` and `/en` to the default network's game and answers a network the game has no data for with 404.
