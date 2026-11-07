# Guess list

`GuessList` (`src/components/game/guess-list.tsx`) is the list of guesses on the design's Web · Playing board: one row per guess, newest first, with the trip from the guessed station to the mystery station drawn as a line. The shorter the line, the closer the guess.

The game page mounts it with the game's state, with the progress dots in its header row, and names `GameLegend` as its footer legend ([game.md](game.md)).

## Props

| Prop | What it is |
| --- | --- |
| `guesses` | The guesses so far, oldest first: each `guess` operation's answer ([api.md](api.md#a-guess)), or the `reveal` operation's guesses. Only `guess`, `correct`, `steps` and `totalMinutes` are read (`ListedGuess` in `src/lib/game/trip-line.ts`) |
| `stations` | The network's stations (`code` and `name`), to name each guess and each known change. A code it does not know shows as the code |
| `progress` | Optional. What the header row shows at the left, opposite "Mystery station": the game page's progress dots |
| `enteringGuess` | Optional. The station code of a guess just made on the page, whose row plays its arrival ([A new guess](#a-new-guess)) |

Before the first guess the list renders nothing.

## The row

`GuessRow` (`src/components/game/guess-row.tsx`) draws one guess. On the left, 240px at most: the guess's number in muted 15px, the station in Barlow Condensed bold 30px, and the summary below it in muted 15px. On the right, the track: the trip line over the time grid. At phone width the track wraps under the station, full width.

The summary is the total time and how the trip changes trains: "2h 25m, change at Utrecht Centraal", "17m, direct", "1h 57m, change at a hidden station" or "2h 25m, 2 changes". Dutch writes hours as `u`: "2u 25m, overstap in Utrecht Centraal". A correct guess says "You're here" / "Hier ben je" and draws no line.

## The trip line

`TripLine` (`src/components/game/trip-line.tsx`) draws the line; `tripLineLayout` (`src/lib/game/trip-line.ts`) works out its shape, with no data and no messages, so it runs in the browser.

- **Scale.** Every minute takes the same width on every row: 150 minutes fill the track, so each of the grid's five columns is 30 minutes and a 29-minute ride is as wide in one trip as in any other. Time runs from the mystery bar at the right edge (0) to the guess dot at the trip's total time. Only a trip shorter than 21 minutes leaves the scale, stretched to 14% so its dot and a bit of line show, and one longer than 2h 30, squeezed into the whole track.
- **Segments.** Each ride is drawn from where it starts to where it ends. The minutes of a change (the wait) run on in the colour of the ride before it, so the next ride starts at the change's end. The rides take the three line colours in order of the changes: `line-1` for the first train, `line-2` after the first change, `line-3` after the second, then `line-1` again ([design-system.md](design-system.md#the-three-line-colours-are-for-trips-only)). The last ride ends at the right edge, the centre of the mystery bar, which covers its last 13px.
- **Change rings.** A 30px `surface` ring with a 4px ink border, centred where the next ride starts, over the unbroken line: empty when the change's station is known, `?` when the `guess` operation hid it (`station: null`, because the player has not guessed that station yet).
- **Ride labels.** Inside each ride, in `on-line` bold 13px, centred in the part the dot, rings and bar leave visible: the train and its time ("IC 2h 02m") when it fits, else the time alone ("30m"), else nothing. Whether a label fits is worked out at about 7.2px a character plus 10px padding, on the track's measured width (`useElementWidth`, `src/lib/use-element-width.ts`, a `ResizeObserver`). The server render, before the browser has measured it, assumes the narrowest track, 340px at phone width, so a wide track can gain train names once the page loads.
- **Guess dot.** A 22px ink dot with a 3px `bg` halo, centred on the start of the first ride.

## A new guess

A guess just made on the page arrives as a train ride. The row gets `guess-enter` (`GuessRow`'s `entering`); the keyframes live in `src/styles.css`, and `TripLine` sets the timings on the elements as CSS variables.

1. **The row opens** at the top of the list (260ms, `max-height` and opacity), pushing the older guesses down rather than jumping them.
2. **The guess dot lands** on the guessed station from 180ms, scaling up with a small overshoot (220ms).
3. **The train runs** from 320ms: the rides are uncovered from the dot to the mystery bar (`clip-path`), easing in and out like a train pulling away and braking (an ease-in-out sine). The run takes longer the longer the line, `tripRunMs` in `src/lib/game/trip-line.ts`: 300ms plus 7ms per percent of track, so about 0.4s for the shortest trip and 1s across the whole track. How long it takes says how far the guess is.
4. **Each change ring drops in** as the train reaches it, with the dot's overshoot. `trainReachesMs` works out when: the inverse of the run's easing at the ring's place.
5. **The labels fade in** as the train arrives (180ms).

A correct guess has no line; its row only opens. Kept guesses, the ones a reload shows, never move: only the answer to the last guess made on the page enters (`useGame`'s `lastAnswer`). With `prefers-reduced-motion: reduce` nothing moves; the row is drawn as it ends.

## Time grid and mystery bar

Behind each track, a 1px `grid` rule every fifth of the track, counted from the right. Below the list, the grid's labels sit under their rules: "30 min", "1 h", "1 h 30", "2 h" (Dutch "1 u", "1 u 30", "2 u"). Above the list on the right, "Mystery station" / "Mysteriestation" with an ink `?` disc names the bar: a 26px `surface` pill with a 4px ink border, from the first row's line to the last.

## Legend

`GameLegend` (`src/components/game/game-legend.tsx`) is the key the playing page's footer shows ([site-shell.md](site-shell.md#footer)): the guess dot "Your guess", a `line-1` swatch "Train and ride time", an empty ring "Change, station known" and a `?` ring "Change, guess it to reveal". It is a list named "Legend" / "Legenda"; the swatches are hidden from screen readers. The countdown to the next station that the design sets beside it comes with the countdown.

## Screen readers

The drawing is hidden (`aria-hidden`); each row carries its whole trip as one visually hidden sentence instead (`spokenGuess` in `src/lib/game/trip-text.ts`), so a screen reader reads the row once, in words:

> Guess 4, Maastricht: 2 hours 25 minutes to the mystery station. IC, 2 hours 2 minutes, change at Utrecht Centraal, 6 minutes, IC, 17 minutes.

Times in the sentence spell out their units, one and many ("1 hour 1 minute", "1 uur 1 minuut"), because a reader would say the visible `25m` as metres. A hidden change reads "change at a hidden station". A correct guess reads "Guess 5, Amersfoort Centraal: the mystery station." The list itself is an `<ol>` named "Your guesses" / "Je gokken".

## Tests

- `src/lib/game/trip-line.test.ts` covers the width and its limits, where each ride and change sits, the same minutes drawn the same width with a change or without, the labels that fit on a narrow and a wide track, hidden changes and the line colours.
- `src/lib/game/trip-text.test.ts` covers the short and the spoken times, the summary and the sentence, in both languages.
- `src/components/game/guess-list.test.tsx` renders the design's four guesses in `happy-dom`: the order, each row's sentence, the drawing hidden, the labels and `?`, the grid labels, Dutch, a correct guess, the entering row's class and timings, and the empty list.
