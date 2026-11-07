# How to play

The rules page, at `/hoe-te-spelen` (`/en/hoe-te-spelen` in English). `src/routes/hoe-te-spelen.tsx` declares it; `HowToPlayPage` (`src/components/how-to-play/how-to-play-page.tsx`) draws it. The header's How to play link points at it on every page ([site-shell.md](site-shell.md#header)).

The design draws How to play only for the iPhone, as a sheet over the game (the Trackdown design canvas's iOS · How to play board). The web page has the same content in the site's page layout instead: the shell's column, the playing board's condensed title, then:

- **The three rules**, numbered in Barlow Condensed: guess any station, we draw the fastest trip to the mystery station, shorter lines are closer and you have six guesses.
- **An example trip** (`ExampleTrip`, `src/components/how-to-play/example-trip.tsx`): the board's guess of Maastricht, 2h 25m away, an IC for 2h 02m, a change at an unknown station and a last ride of 17 minutes. It is drawn by the game's own `GuessList` ([guess-list.md](guess-list.md)), so it looks exactly like a row on the game page, mystery bar, time grid and screen reader sentence included. The board's caption explains the unknown change below it. The data is fixed in the component; nothing is loaded.
- **The line legend**, the game's `GameLegend` ([guess-list.md](guess-list.md#legend)), under its own heading. The page names no `footerLegend`, so the footer shows its tagline.
- **Play today's station**, a 52px button linking to today's puzzle.

The board's headings are "How to play" only; the page adds a heading over the example and the legend, so a screen reader can jump between the parts.

The page sets its own `<title>` (`howToPlay.pageTitle`) and description through `seo()` ([seo.md](seo.md)).

## Messages

Every string lives under `howToPlay` in `messages/nl.json` and `messages/en.json`. The rules say "six guesses" in words, as the board does; change them with `maxGuesses` in `src/lib/game/rules.ts`.

## Tests

`src/components/how-to-play/how-to-play-page.test.tsx` checks the rules, the example's screen reader sentence, the legend and the English page's link to `/en`. `src/router.test.tsx` checks that `/hoe-te-spelen` answers 200 inside the shell with its title.
