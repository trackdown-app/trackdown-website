# The game page

The home page, `/` (`/en` in English), is today's puzzle on the Dutch network, after the design's Web · Playing board. `src/routes/index.tsx` loads it; `GamePage` (`src/components/game/game-page.tsx`) draws it.

## The route

The loader fills two queries ([data-loading.md](data-loading.md)): `todayPuzzleQueryOptions("nl")` and `stationsQueryOptions("nl", locale)`. The component reads both with `useSuspenseQuery` and hands them to `GamePage`. The route names `GameLegend` as its footer legend ([site-shell.md](site-shell.md#footer)). The network is fixed at `nl` until the network picker lands.

## The page

Top to bottom, in the shell's 1080px column:

- **The day.** "Friday 6 November, puzzle 142" / "Vrijdag 6 november, puzzel 142", in muted 16px. `puzzleDateLabel` (`src/lib/game/puzzle-date-label.ts`) names the puzzle's `date` in the page's locale, read in UTC, so it never shifts with the reader's time zone.
- **The question.** The `h1`, "Which station is today's mystery?", and the intro below it.
- **The search.** `StationSearch` ([station-search.md](station-search.md)), told which guess this is and which stations were guessed. When a guess does not go through (a network error, the rate limit), an alert under it says so; nothing is kept and the player can guess again.
- **The guesses.** `GuessList` ([guess-list.md](guess-list.md)), newest first, with the progress dots in its header row opposite "Mystery station". Before the first guess the list, and so the progress, is not shown.

Once the game is over the search gives way to one line: "You tracked it down in N of 6." or "No guesses left. A new mystery station comes at midnight." Under it is the Share result button, and under the guesses the "What you'll share" preview ([share.md](share.md)). The Solved and Missed screen will replace that line.

## Progress

`GameProgress` (`src/components/game/game-progress.tsx`) is the design's row of dots, one per guess the puzzle allows: 12px, 16px apart, on a 3px line in `empty`.

- A guess made is a filled `ink` dot.
- The guess now is a ring with a 3px `ink` border; the ones still to come have an `empty` border.
- The line is `ink` up to the guess now, or up to the last guess once the game is over.
- After a guess the `ink` line slides on to the next dot (500ms, eased like the trip line's train) and the dots change colour (300ms). Not with `prefers-reduced-motion: reduce`.

Beside the dots, in 16px semibold: "Guess 5 of 6, newest first", "Found in 4 of 6, newest first" or "All 6 guesses used, newest first". The dots are hidden from screen readers; the words say the same.

## Game state

`useGame` (`src/lib/game/use-game.ts`) holds the game at one puzzle:

- **Guesses.** Each one the `guess` operation's answer (`guess`, `correct`, `steps`, `totalMinutes`), oldest first, read from the store.
- **Status.** `gameStatus` (`src/lib/game/game-state.ts`): `won` once a guess is correct, `lost` once the puzzle's `maxGuesses` (6) guesses are made, else `playing`.
- **A guess.** Goes through a `useMutation` that calls `submitGuessFn` with the earlier guesses, so the server can check the game and name the changes the player already guessed ([api.md](api.md#a-guess)). On success the answer is added to the kept game, and each kept guess takes its steps from the answer's `earlierTrips`, so a change hidden on an earlier trip shows its station once the player guesses it ("change at a hidden station" becomes "change at Utrecht Centraal"). A guess is ignored while one is on its way or once the game is over.
- **Screen readers.** A polite live region reads out the answer to each guess made on the page, as the guess list's sentence for that row. Kept guesses a reload shows are not read out.
- **Arrival.** The same answer's row plays the train ride of [guess-list.md](guess-list.md#a-new-guess); kept guesses do not move.

The server render has no storage, so it renders a game with no guesses. `useSyncExternalStore` reads the kept game as the page hydrates, and again after every write, here or in another tab.

## Storage

A game is kept in `localStorage` under `trackdown:game:v1:{network}:{number}`, one entry per network and puzzle, as `{"guesses":[…]}`. A new day is a new puzzle number and so a new game; old entries stay, for the archive and statistics to come.

`createGameStore` (`src/lib/game/game-store.ts`) guards every read and write with `try`/`catch`. Where storage is unavailable (blocked, full, a private window that refuses it) a write is held in the page's memory instead: the game plays as usual, it just does not survive a reload. An entry that is not valid JSON or not a game this version wrote reads as a game with no guesses. A breaking change to the format bumps the `v1` in the key.

## Tests

- `src/lib/game/game-state.test.ts` covers the key, writing and reading back a game, broken entries, the status, and the store with storage and without.
- `src/components/game/game-page.test.tsx` renders the page in `happy-dom` with `submitGuessFn` mocked: the day line, kept guesses and progress, a guess sent with the earlier ones and kept over a reload, a hidden change on an earlier trip named once it is guessed, a game without storage, winning, losing, a guess that fails, Dutch, and sharing the result ([share.md](share.md#tests)).
- `src/router.test.tsx` renders `/` through the router with the server functions mocked.
