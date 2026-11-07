# Guess list

`GuessList` (`src/components/game/guess-list.tsx`) is the list of guesses on the design's Web · Playing board: one row per guess, newest first, with the trip from the guessed station to the mystery station drawn as a line. The shorter the line, the closer the guess.

No page shows it yet: the game page, still to come, mounts it with the game's state, and names `GameLegend` as its footer legend.

## Props

| Prop | What it is |
| --- | --- |
| `guesses` | The guesses so far, oldest first: each `guess` operation's answer ([api.md](api.md#a-guess)), or the `reveal` operation's guesses. Only `guess`, `correct`, `steps` and `totalMinutes` are read (`ListedGuess` in `src/lib/game/trip-line.ts`) |
| `stations` | The network's stations (`code` and `name`), to name each guess and each known change. A code it does not know shows as the code |

Before the first guess the list renders nothing.

## The row

`GuessRow` (`src/components/game/guess-row.tsx`) draws one guess. On the left, 240px at most: the guess's number in muted 15px, the station in Barlow Condensed bold 30px, and the summary below it in muted 15px. On the right, the track: the trip line over the time grid. At phone width the track wraps under the station, full width.

The summary is the total time and how the trip changes trains: "2h 25m, change at Utrecht Centraal", "17m, direct", "1h 57m, change at a hidden station" or "2h 25m, 2 changes". Dutch writes hours as `u`: "2u 25m, overstap in Utrecht Centraal". A correct guess says "You're here" / "Hier ben je" and draws no line.

## The trip line

`TripLine` (`src/components/game/trip-line.tsx`) draws the line; `tripLineLayout` (`src/lib/game/trip-line.ts`) works out its shape, with no data and no messages, so it runs in the browser.

- **Width.** The line runs from the guess dot at the left to the mystery bar at the right edge, as a share of the track: 150 minutes fill it, so each of the grid's five columns is 30 minutes. A trip shorter than 21 minutes still takes 14%, so its dot and a bit of line show; a trip longer than 2h 30 takes the whole track.
- **Segments.** Each ride is as wide as its share of the trip's ride time. The rides take the three line colours in order of the changes: `line-1` for the first train, `line-2` after the first change, `line-3` after the second, then `line-1` again ([design-system.md](design-system.md#the-three-line-colours-are-for-trips-only)). The last ride runs 13px under the mystery bar.
- **Change rings.** A 30px `surface` ring with a 4px ink border sits at each change: empty when the change's station is known, `?` when the `guess` operation hid it (`station: null`, because the player has not guessed that station yet).
- **Ride labels.** Inside each ride, in `on-line` bold 13px: the train and its time ("IC 2h 02m") when it fits, else the time alone ("30m"), else nothing. Whether a label fits is worked out for the narrowest track, 340px at phone width, at about 7.2px a character plus 10px padding, so a label never spills at any width and every width shows the same labels.
- **Guess dot.** A 22px ink dot with a 3px `bg` halo, over the start of the first ride.

## Time grid and mystery bar

Behind each track, a 1px `grid` rule every fifth of the track, counted from the right. Below the list, the grid's labels sit under their rules: "30 min", "1 h", "1 h 30", "2 h" (Dutch "1 u", "1 u 30", "2 u"). Above the list on the right, "Mystery station" / "Mysteriestation" with an ink `?` disc names the bar: a 26px `surface` pill with a 4px ink border, from the first row's line to the last.

## Legend

`GameLegend` (`src/components/game/game-legend.tsx`) is the key the playing page's footer shows ([site-shell.md](site-shell.md#footer)): the guess dot "Your guess", a `line-1` swatch "Train and ride time", an empty ring "Change, station known" and a `?` ring "Change, guess it to reveal". It is a list named "Legend" / "Legenda"; the swatches are hidden from screen readers. The countdown to the next station that the design sets beside it comes with the countdown.

## Screen readers

The drawing is hidden (`aria-hidden`); each row carries its whole trip as one visually hidden sentence instead (`spokenGuess` in `src/lib/game/trip-text.ts`), so a screen reader reads the row once, in words:

> Guess 4, Maastricht: 2 hours 25 minutes to the mystery station. IC, 2 hours 2 minutes, change at Utrecht Centraal, 6 minutes, IC, 17 minutes.

Times in the sentence spell out their units, one and many ("1 hour 1 minute", "1 uur 1 minuut"), because a reader would say the visible `25m` as metres. A hidden change reads "change at a hidden station". A correct guess reads "Guess 5, Amersfoort Centraal: the mystery station." The list itself is an `<ol>` named "Your guesses" / "Je gokken".

## Tests

- `src/lib/game/trip-line.test.ts` covers the width and its limits, the labels that fit, hidden changes and the line colours.
- `src/lib/game/trip-text.test.ts` covers the short and the spoken times, the summary and the sentence, in both languages.
- `src/components/game/guess-list.test.tsx` renders the design's four guesses in `happy-dom`: the order, each row's sentence, the drawing hidden, the labels and `?`, the grid labels, Dutch, a correct guess and the empty list.
