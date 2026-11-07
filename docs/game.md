# The game page

A network's game, `/{network}` (`/en/{network}` in English, `/nl` for the Dutch network), is today's puzzle on that network, after the design's Web · Playing board. `/` sends a visitor to the game of the network they chose ([network-picker.md](network-picker.md)). `src/routes/$network/index.tsx` loads it; `GamePage` (`src/components/game/game-page.tsx`) draws it. The archive plays an earlier puzzle with the same `GamePage`, given `archive` ([archive.md](archive.md#playing-an-earlier-puzzle)).

## The route

The loader fills two queries ([data-loading.md](data-loading.md)): `todayPuzzleQueryOptions(network)` and `stationsQueryOptions(network, locale)`, `network` from the route's context ([network-picker.md](network-picker.md#routes)). The component reads both with `useSuspenseQuery` and hands them to `GamePage`. The route names `PlayingFooterLegend` (`src/components/game/playing-footer-legend.tsx`) as its footer legend ([site-shell.md](site-shell.md#footer)): the line legend and the [countdown](#countdown). The countdown reads the network from the page (`useCurrentNetwork`).

The loader returns today's puzzle number, which the route's `head()` puts in the title and link preview, "Trackdown NL · Puzzel 142", never the station ([seo.md](seo.md#a-pages-tags)).

## The page

Top to bottom, in the shell's 1080px column:

- **The day.** "Friday 6 November, puzzle 142" / "Vrijdag 6 november, puzzel 142", in muted 16px. `puzzleDateLabel` (`src/lib/game/puzzle-date-label.ts`) names the puzzle's `date` in the page's locale, read in UTC, so it never shifts with the reader's time zone.
- **The question.** The `h1`, "Which station is today's mystery?", and the intro below it.
- **The search.** `StationSearch` ([station-search.md](station-search.md)), told which guess this is and which stations were guessed. When a guess does not go through (a network error, the rate limit), an alert under it says so; nothing is kept and the player can guess again.
- **The guesses.** `GuessList` ([guess-list.md](guess-list.md)), newest first, with the progress dots in its header row opposite "Mystery station". Before the first guess the list, and so the progress, is not shown.

Once the game is over the question, the search and the progress give way to the solved or missed screen, below the day.

## Solved and missed

`GameOver` (`src/components/game/game-over.tsx`) is the finished game, after the design's Web · Solved board, in the same column:

- **The answer plate.** `AnswerPlate` (`src/components/game/answer-plate.tsx`): a 16px-cornered plate in `plate`, the theme turned over ([design-system.md](design-system.md#colour)). The logo mark in its plate colours, its bar filled, beside how it went in `plate-muted` 18px: "You tracked it down in 5 of 6 guesses" / "Je hebt hem gevonden in 5 van 6 gokken", or when missed "No guesses left. The mystery station was" / "Geen gokken meer. Het mysteriestation was". Below it the mystery station as the page's `h1`, Barlow Condensed 800, 52px to 112px with the width. The plate is a section named "Today's answer" / "Het antwoord van vandaag".
- **The buttons.** "Share result" / "Deel je resultaat", the ink main button with a share icon, and "Play an older puzzle" / "Speel een eerdere puzzel", an outlined link to the network's archive (`/{network}/archief`, `networkArchivePath`, [archive.md](archive.md)). Both 52px, 12px corners. The share button shares the result ([share.md](share.md#sharing)), and a status line under the buttons says when it was copied instead.
- **How you got there.** `GuessList` in its revealed form ([guess-list.md](guess-list.md#revealed)): every guess, newest first, every change named.
- **Your record and what you'll share.** Side by side in a row that wraps: the player's record at the network ([statistics.md](statistics.md)), and `SharePreview` ([share.md](share.md#the-preview)), the exact text the share button hands on, without station names.

### The answer comes from the reveal

The page never knows the mystery station while the game is on. Once it is over, `GameOver` asks the `reveal` operation for the kept guesses (`revealQueryOptions`, [data-loading.md](data-loading.md#a-read-sent-as-a-post)), and the plate and the list come from its answer. Until it answers, a bar holds the station's place in the plate (read out as "Loading the answer") and the list is not shown. When it fails (a network error, the rate limit), the plate says "The answer didn't load." as an alert with a "Try again" button that asks again. A kept game shown again after a reload asks once more; the answer is cached for the page's life.

**Focus.** When the guess that ends the game is made on the page, the search it came from is gone, so focus moves to the plate's heading once the reveal has answered (or failed). A finished game shown again after a reload leaves focus alone.

## Progress

`GameProgress` (`src/components/game/game-progress.tsx`) is the design's row of dots, one per guess the puzzle allows: 12px, 16px apart, on a 3px line in `empty`.

- A guess made is a filled `ink` dot.
- The guess now is a ring with a 3px `ink` border; the ones still to come have an `empty` border.
- The line is `ink` up to the guess now, or up to the last guess once the game is over.
- After a guess the `ink` line slides on to the next dot (500ms, eased like the trip line's train) and the dots change colour (300ms). Not with `prefers-reduced-motion: reduce`.

Beside the dots, in 16px semibold: "Guess 5 of 6, newest first". The page shows the progress only while the game is on; `GameProgress` also words a finished game ("Found in 4 of 6, newest first", "All 6 guesses used, newest first") for a view that shows one. The dots are hidden from screen readers; the words say the same.

## Countdown

`NextPuzzleCountdown` (`src/components/game/next-puzzle-countdown.tsx`) is the footer's "Next station in 13:42:08" / "Volgend station over 13:42:08", from the design's Web · Playing board: muted text, the time in ink and bold. It sits opposite the line legend while playing and after the game is over. The design's Web · Solved board also sets it under "What you'll share" ([share.md](share.md)); it is not there yet.

- **The time left** is from now to today's puzzle's `nextPuzzleAt`, the next midnight in Europe/Amsterdam ([api.md](api.md#todays-puzzle)), read from the `todayPuzzle` query the route's loader filled. `secondsUntil` and `countdownClock` (`src/lib/game/countdown.ts`) turn it into `hh:mm:ss`. Both ends are instants, so the day the clocks change counts its real 23 or 25 hours: just after midnight on the last Sunday of October it shows `24:59:59`. The time is a `<time>` whose `dateTime` is the same as an ISO 8601 duration (`PT13H42M8S`).
- **Ticking.** `useNow` (`src/lib/use-now.ts`) is a clock for `useSyncExternalStore` that ticks at the start of every second, aimed at the next whole second so a throttled timer does not drift.
- **Server render and hydration.** The server renders the time left by its own clock. The browser's first render reads its own clock, a second or two later, so the `<time>` is `suppressHydrationWarning`: React keeps the server's text and the next tick puts it right. The figures are tabular and always `hh:mm:ss`, so nothing moves when it does.
- **At zero** the countdown invalidates the `todayPuzzle` query. The new answer is a new puzzle number, so the page plays a new game ([Storage](#storage)) and the countdown starts again from the new `nextPuzzleAt`. A browser clock ahead of the server's reaches zero first and gets today's puzzle again: it shows `00:00:00` and asks every 10 seconds until the new puzzle is in.
- **Without the puzzle** (its read failed) the countdown is not shown.

## Game state

`useGame` (`src/lib/game/use-game.ts`) holds the game at one puzzle:

- **Guesses.** Each one the `guess` operation's answer (`guess`, `correct`, `steps`, `totalMinutes`), oldest first, read from the store.
- **Status.** `gameStatus` (`src/lib/game/game-state.ts`): `won` once a guess is correct, `lost` once the puzzle's `maxGuesses` (6) guesses are made, else `playing`.
- **A guess.** Goes through a `useMutation` that calls `submitGuessFn` with the earlier guesses, so the server can check the game and name the changes the player already guessed ([api.md](api.md#a-guess)). On success the answer is added to the kept game, and each kept guess takes its steps from the answer's `earlierTrips`, so an unknown change on an earlier trip shows its station once the player guesses it ("change at an unknown station" becomes "change at Utrecht Centraal"). A guess is ignored while one is on its way or once the game is over.
- **Screen readers.** A polite live region reads out the answer to each guess made on the page, as the guess list's sentence for that row. Kept guesses a reload shows are not read out.
- **Arrival.** The same answer's row plays the train ride of [guess-list.md](guess-list.md#a-new-guess); kept guesses do not move.

The server render has no storage, so it renders a game with no guesses. `useSyncExternalStore` reads the kept game as the page hydrates, and again after every write, here or in another tab.

## Storage

Successful guesses also emit the typed [game analytics events](analytics.md#game-events): first play, each guess, the outcome and first archive play. Failed guesses and restored games emit none; event properties contain only puzzle metadata and counts.

A game is kept in `localStorage` under `trackdown:game:v1:{network}:{number}`, one entry per network and puzzle, as `{"guesses":[…]}`, with `"archive":true` once a guess at it was made in the archive ([archive.md](archive.md#the-streak)), which keeps it out of the streak ([statistics.md](statistics.md#streaks)). A new day is a new puzzle number and so a new game; old entries stay, for the archive's results and the statistics.

`createGameStore` (`src/lib/game/game-store.ts`) guards every read and write with `try`/`catch`. Where storage is unavailable (blocked, full, a private window that refuses it) a write is held in the page's memory instead: the game plays as usual, it just does not survive a reload. An entry that is not valid JSON or not a game this version wrote reads as a game with no guesses. A breaking change to the format bumps the `v1` in the key.

## Tests

- `src/lib/game/game-state.test.ts` covers the key, writing and reading back a game, broken entries, the status, and the store with storage and without.
- `src/components/game/game-page.test.tsx` renders the page in `happy-dom` with `submitGuessFn` mocked: the day line, kept guesses and progress, a guess sent with the earlier ones and kept over a reload, an unknown change on an earlier trip named once it is guessed, a game without storage, a guess that fails, Dutch. With `revealAnswerFn` mocked too: winning (the reveal asked once with the guesses, the answer as the focused heading, the revealed list, the buttons), missing (every change named, focus left alone), no answer before the reveal answers, and a reveal that fails and is asked again; sharing the result ([share.md](share.md#tests)); the record, with `getPuzzleArchiveFn` mocked ([statistics.md](statistics.md#tests)).
- `src/lib/game/countdown.test.ts` covers the clock and the duration, midnight in Amsterdam rather than UTC, and the 23- and 25-hour days the clocks change.
- `src/components/game/next-puzzle-countdown.test.tsx` renders the countdown in `happy-dom` with fake timers and `getTodayPuzzleFn` mocked: the text in both languages, ticking, reading the puzzle again at zero, asking again while the server still answers the old one, and hydrating over a server render two seconds older without an error.
- `src/router.test.tsx` renders `/nl` through the router with the server functions mocked, the countdown in its footer.
