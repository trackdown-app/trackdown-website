# The archive

Every puzzle so far, so a player can catch up on the ones they missed. Two routes under each network ([network-picker.md](network-picker.md#routes)):

- `/{network}/archief` (`/en/{network}/archief`, `/nl/archief` for the Dutch network): the list, `src/routes/$network/archief/index.tsx`, drawn by `ArchivePage` (`src/components/archive/archive-page.tsx`).
- `/{network}/archief/{number}` (`/en/{network}/archief/{number}`): one earlier puzzle played, `src/routes/$network/archief/$number.tsx`, drawn by the game's own `GamePage` ([game.md](game.md)).

The header's Archive link and the solved screen's "Play an older puzzle" point at the list. The design draws no archive board, so the list takes How to play's title block and the guess list's hairlines ([design-system.md](design-system.md#defaults-for-what-the-design-does-not-draw)).

## The list

The loader fills `puzzleArchiveQueryOptions(network)`, the `puzzleArchive` operation ([api.md](api.md#the-archive)): every puzzle up to today's, oldest first, without its station. It also returns today's date in Europe/Amsterdam (`puzzleDate`), read where the loader runs, so the server render and the page it hydrates agree on which puzzle is today's.

The page shows the condensed `h1` "Archive" / "Archief", a lead that says archive puzzles do not count for the streak, then an `<ol>` named "Puzzles" / "Puzzels", newest first. Each row (`ArchivePuzzleRow`, `src/components/archive/archive-puzzle-row.tsx`) is one link, at least 64px high, between `rule` hairlines:

- **The puzzle**: "Puzzle 142" / "Puzzel 142" in Barlow Condensed, today's marked "Today" / "Vandaag", and its day below in muted text, named like the game page's day line (`puzzleDateLabel`).
- **The result** on this device, from the game kept in `localStorage` ([game.md](game.md#storage)), worded by `archiveResult` (`src/lib/game/archive-result.ts`): "Not played yet", "Guess 3 of 6" while it is on, "Found in 4 of 6", or "Missed".

Today's row links to the network's game, where today's puzzle is played; every other row to `/{network}/archief/{number}`. The server render has no storage, so every row says "Not played yet" until the browser reads the kept games as it hydrates; a game played in another tab updates its row. Before puzzle 1 the list is replaced by "There are no puzzles yet."

The archive grows by one puzzle at the start of the day after its newest, so `puzzleArchiveQueryOptions` keeps its answer fresh until then (its `staleTime`), as today's puzzle does until `nextPuzzleAt`.

## Playing an earlier puzzle

The loader fills the archive and the stations queries and finds `{number}` in the archive, written exactly as the archive writes it:

- **A puzzle after today's** is not in the archive, so the route throws `notFound()` and the server answers the not-found page with 404 ([site-shell.md](site-shell.md#not-found-and-error-pages)). So do `0`, `0142`, `abc` and any number the schedule does not have: a future puzzle is indistinguishable from one that does not exist, as in the API.
- **Today's puzzle** redirects (307) to the network's game, so it has one address and counts for the streak.
- **An earlier puzzle** is played by `GamePage` with `archive`, its `maxGuesses` from `src/lib/game/rules.ts`. It is the same game as the network's game page: the search, the guess list, the progress, the reveal, sharing. Only the words change: the question is "Which station was the mystery?" / "Welk station was het mysterie?" and the answer plate is "The answer" / "Het antwoord" rather than today's. The route keys the page by the puzzle's number, so moving to another puzzle starts a fresh game.

The page sets its own `<title>`, "Puzzle 142 · Trackdown" (`archive.puzzlePageTitle`), the list "Archive · Trackdown" (`archive.pageTitle`). Its footer legend is the line legend only (`GameLegend`): the countdown is to today's next puzzle, not this one's.

## The streak

Archive games do not count for the streak. Every guess made on `/{network}/archief/{number}` marks the kept game `"archive": true` (`serializeGame`, `src/lib/game/game-state.ts`), and once marked it stays marked, even when the game is played on elsewhere. `parseStoredGame` reads it back as `archive`. A game played only on its own day, on the network's game page, has no `archive` field, so games kept before the archive read the same. Statistics, when they come, count a streak from games without it.

## Messages

Every string lives under `archive` in `messages/nl.json` and `messages/en.json`, with `game.archiveTitle` and `gameOver.archiveLabel`.

## Tests

- `src/components/archive/archive-page.test.tsx` renders the list in `happy-dom` inside a router: newest first, today's row linking to `/en/nl`, the others to `/en/nl/archief/{number}`, each result kept on the device, a row updated by a write from another tab, no puzzles yet, and the server render in Dutch with every row not played.
- `src/components/game/game-page.test.tsx` plays an archive game: the past-tense question, the kept game marked as an archive game after a guess and still marked when played on, and the answer plate's name.
- `src/lib/game/game-state.test.ts` reads back the `archive` mark and leaves it out of a game played on its day.
- `src/router.test.tsx` answers `/nl/archief` with the list, `/nl/archief/142` with the game and the line legend but no countdown, today's puzzle with a redirect to `/nl`, and a future puzzle, `0`, `0142` and `abc` with 404.
- `src/components/layout/site-header.test.tsx` marks Archive as the current page on a puzzle of the archive too.
