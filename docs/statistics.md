# Statistics

A player's record at one network, after the design's "Your Netherlands record" on the Web · Solved board: played, won, the streak, the best streak and the guesses needed. It is worked out in the browser from the games kept on this device ([game.md](game.md#storage)); nothing is sent anywhere. It shows on the solved and missed screen, and in the dialog the header's statistics button opens.

## The record

`StatisticsRecord` (`src/components/game/statistics-record.tsx`) draws it without a heading, so each place gives its own: "Your Netherlands record" / "Jouw record in Nederland" (`statistics.title`, the network's name from `networkName`, `src/lib/game/network-name.ts`).

- **The figures.** `StatisticsSummary` (`src/components/game/statistics-summary.tsx`): a `<dl>` of Played, Won (a whole percent), Streak and Best streak, the labels in muted 15px, the figures in Barlow Condensed 700 at 48px. Four in a row; two rows of two below 640px, where four figures do not fit a phone.
- **Guesses needed.** `GuessDistribution` (`src/components/game/guess-distribution.tsx`): one row per number of guesses a game was won in, 1 to 6, then Missed. Each bar is 10px high with 5px corners, as long as its count against the longest (80% of the row at most, 2% at least), the count after it in semibold. Today's game's bar is `line-1`; the others are `empty`. The labels and bars are hidden from screen readers; each row reads as a sentence instead ("2 guesses: 11, today's game").
- **Loading and failing.** Until the archive is in, a muted line says "Loading your record". When it fails (a network error, the rate limit) an alert says "Your record didn't load." with a "Try again" button.

## The numbers

`computeStatistics` (`src/lib/game/statistics.ts`) is a pure function of the archive and the kept games:

- **Puzzles** come from the `puzzleArchive` operation ([api.md](api.md#the-archive)): every puzzle up to today's, today's the latest by date. `useStatistics` (`src/lib/game/use-statistics.ts`) reads it with `puzzleArchiveQueryOptions` and reads each puzzle's kept game from the store, again after every write here or in another tab.
- **Played** is every finished game, won or lost, at any puzzle; a game still on does not count. **Won** is the won games as a whole percent of those played, 0 before the first.
- **Guesses needed** counts each won game under the guesses it took, and each lost one under Missed. **Today's** bar is the latest puzzle's game, once it is finished.

### Streaks

The streak is the number of puzzles in a row, by date, won on their own day in Europe/Amsterdam.

- A puzzle lost, not played, or finished on a later day (from the archive) breaks it.
- Today's puzzle breaks nothing while it is still to play, so a streak runs on from yesterday until today's puzzle is lost or the day is over.
- A day without a puzzle in the schedule is not a day to miss.
- The best streak is the longest run so far, the current one included.

Which day a game ended is kept with it, as `finishedOn` (`YYYY-MM-DD`, the Amsterdam date by the browser's clock when the last guess comes back). A game kept before statistics has none; the archive could not be played then, so it counts as played on its day.

## The dialog

`StatisticsDialog` (`src/components/layout/statistics-dialog.tsx`) is the header's statistics button ([site-shell.md](site-shell.md#header)) and the dialog it opens: the record at today's network (`todayNetwork`), its title as the dialog's name, and a 44px close button named "Close" / "Sluiten". The record is only read once the dialog opens, so a page that never opens it never asks for the archive. Escape and a click outside close it; focus goes back to the button.

The dialog is shadcn/ui's (base-vega, on Base UI), split one part per file: `Dialog` and `DialogTrigger` (`src/components/ui/dialog.ts`), `DialogContent` (the backdrop, a `card` plate with 16px corners and the popover shadow, and the close button, whose label is a prop) and `DialogTitle`.

## Solved and missed

`GameOver` sets the record in a section named by its `h2`, beside "What you'll share" in a row that wraps: the record takes 420px or more, the share preview 340px or more, 48px apart ([game.md](game.md#solved-and-missed)).

## Tests

- `src/lib/game/statistics.test.ts` covers the zeros before a first game, played, won and the guesses needed, a game still on, today's result, and streaks: today's included, kept while today is to play, broken by a skipped day, a missed day, a lost today and a puzzle finished a day late, a game kept without its day, and puzzles in any order.
- `src/components/game/game-page.test.tsx` wins a game with two earlier ones kept and checks the figures, the rows and today's bar, and that `finishedOn` is kept; and a record that fails to load and is asked again.
- `src/components/layout/statistics-dialog.test.tsx` checks the archive is not read until the dialog opens, the record and the streak inside it, closing it, and its Dutch name.
