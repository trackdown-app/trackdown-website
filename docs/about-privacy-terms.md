# About, privacy and terms

Three text pages, implementing [issue #45](https://github.com/trackdown-app/trackdown-website/issues/45). The footer links all three on every page, in both languages ([site-shell.md](site-shell.md#footer)).

| Page | Route | Component | Messages |
| --- | --- | --- | --- |
| About, `/over` | `src/routes/over.tsx` | `AboutPage` | `about`, `legal` |
| Privacy policy, `/privacy` | `src/routes/privacy.tsx` | `PrivacyPage` | `privacy` |
| Terms of use, `/voorwaarden` | `src/routes/voorwaarden.tsx` | `TermsPage` | `terms` |

The components live in `src/components/legal/`. Each page sets its own title and description through `seo()` ([seo.md](seo.md)) and is in the sitemap.

## Layout

The design draws the Web · Privacy policy and Web · Terms of use boards on the Trackdown design canvas. `LegalPage` is their layout: a 720px article in the shell's column with the "Last updated" line, the condensed 44–72px title and a muted introduction, then its sections. `LegalSection` is one titled section, its `h2` naming it for a screen reader. Links inside running text use `textLink`, the first line colour, as on the boards. The privacy policy's short version sits in a card with a 2px ink border on the surface colour.

The design draws no About board, so About takes the same layout without a date.

Every paragraph is a message. A sentence that holds a link is split into a part before and a part after it (`privacy.whoBefore`, `privacy.whoAfter`), because a message cannot hold markup. The contact address is `contactEmail` in `src/lib/contact.ts`, drawn by `MailLink`.

## About

What Trackdown is, how trips are worked out, and the attribution the data licences ask for: OVapi GTFS-NL (NDOV open data, CC0 1.0) and PDOK Bestuurlijke Gebieden (© Kadaster, CC BY 4.0), each licence linked. It says Trackdown is not linked to NS or any other railway, and gives the contact address.

## Privacy policy

The policy must say what the site does. It describes:

- **Local storage**: saved games ([game.md](game.md)), from which the record is worked out ([statistics.md](statistics.md)), and the theme override ([design-system.md](design-system.md#dark-mode)).
- **The site's own cookies**: `trackdown-consent` ([analytics.md](analytics.md#consent-cookie)) and `trackdown-network` ([network-picker.md](network-picker.md#keeping-the-choice)), both a year.
- **PostHog in the browser**: cookieless by default on legitimate interest, the PostHog cookie only after Accept on consent, what events hold and never hold, the discarded IP address ([analytics.md](analytics.md)).
- **Cloudflare**: the managed proxy at `t.trackdown.nl` runs on Cloudflare's network. PostHog's [proxy guide](https://posthog.com/docs/advanced/proxy) says the traffic is "transmitted to and processed by Cloudflare", a subprocessor in its DPA, that Cloudflare keeps no request logs for it, and that EU-only edge termination is not guaranteed. The policy names Cloudflare in the analytics section and under who else gets data.
- **The server**: Vercel's request logs, the guess sent to work out the trip, and server logs and traces to PostHog EU ([logging.md](logging.md)).
- **Recipients, rights, the Autoriteit Persoonsgegevens and changes.**

Retention in the copy: analytics data 12 months (PostHog's free plan keeps events a year), server logs and traces in PostHog 14 days (the Logs default), Vercel's runtime logs about an hour (the Hobby plan). Change the copy when a plan or setting changes.

A change to what the site stores or sends changes this page and its "Last updated" date (`privacy.updated`) in the same change. If the change needs new consent, raise `CONSENT_TEXT_VERSION` ([analytics.md](analytics.md#consent-cookie)).

## Terms of use

The board's copy: free and as it is, a game and not a journey planner, play fair, who owns what, liability as far as Dutch law allows, a link to the privacy policy, and Dutch law. Its date is `terms.updated`.

## Tests

`src/components/legal/legal-pages.test.tsx` checks each page's content in Dutch or English: the contact link, the storage, PostHog, Cloudflare and Vercel sections, the localized privacy link from Terms, and the licence links on About. `src/router.test.tsx` checks that each route answers 200 inside the shell with its title and a current footer link.
