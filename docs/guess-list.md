# Guess list

`GuessList` (`src/components/game/guess-list.tsx`) is the list of guesses on the design's Web · Playing board: one row per guess, newest first, with the trip from the guessed station to the mystery station drawn as a line. The shorter the line, the closer the guess.

The game page mounts it with the game's state, with the progress dots in its header row, and shows `GameLegend` in its footer ([game.md](game.md)).

## Props

| Prop | What it is |
| --- | --- |
| `guesses` | The guesses so far, oldest first: each `guess` operation's answer ([api.md](api.md#a-guess)), or the `reveal` operation's guesses. Only `guess`, `correct`, `steps` and `totalMinutes` are read (`ListedGuess` in `src/lib/game/trip-line.ts`) |
| `stations` | The network's stations (`code` and `name`), to name each guess and each known change. A code it does not know shows as the code |
| `progress` | Optional. What the header row shows at the left, opposite "Mystery station": the game page's progress dots |
| `enteringGuess` | Optional. The station code of a guess just made on the page, whose row plays its arrival ([A new guess](#a-new-guess)) |
| `revealed` | Optional. The finished game's list on the solved screen ([Revealed](#revealed)); `progress` is not shown |

Before the first guess the list renders nothing.

## The row

`GuessRow` (`src/components/game/guess-row.tsx`) draws one guess. On the left, 240px at most: the guess's number in muted 15px, the station in Barlow Condensed bold 30px, and the summary below it in muted 15px. On the right, the track: the trip line over the time grid. At phone width the track wraps under the station, full width.

The summary is the total time and how the trip changes trains: "2h 25m, change at Utrecht Centraal", "17m, direct", "1h 57m, change at an unknown station" or "2h 25m, 2 changes". Dutch writes hours as `u`: "2u 25m, overstap in Utrecht Centraal". A correct guess says "You're here" / "Hier ben je" and draws no line.

## The trip line

`TripLine` (`src/components/game/trip-line.tsx`) draws the line; `tripLineLayout` (`src/lib/game/trip-line.ts`) works out its shape, with no data and no messages, so it runs in the browser.

- **Scale.** Every minute takes the same width on every row, so a 29-minute ride is as wide in one trip as in any other. The whole board shares one scale, `boardMinutes` (`src/lib/game/trip-line.ts`): the track spans 2h 30, five grid columns of 30 minutes, or, once a guess's trip is longer, that trip rounded up to the next half hour (3h 03m spans 3h 30, seven columns). Every row then draws smaller; its parts glide to their new places (500ms, not with `prefers-reduced-motion: reduce`). Time runs from the mystery bar at the right edge (0) to the guess dot at the trip's total time. Only a line shorter than 48px leaves the scale, stretched to 48px so its dot shows beside the bar.
- **Segments.** Each ride is drawn over its own minutes only, so "IC 37m" is one width whatever the wait after it. The minutes of a change, the wait, belong to the change's pill. The rides take the three line colours in order of the changes: `line-1` for the first train, `line-2` after the first change, `line-3` after the second, then `line-1` again ([design-system.md](design-system.md#the-three-line-colours-are-for-trips-only)). The last ride ends at the right edge, the centre of the mystery bar, which covers its last 13px.
- **Changes.** A 30px tall `surface` shape with a 4px ink border over the wait between two rides, as a metro map draws an interchange: a 30px ring for a short wait, stretching into a pill as long as a longer one, reaching 3px over each ride. It is anchored where the next ride leaves, its right end always 3px over that ride, so the ride after it shows its own minutes less 3px whatever the wait, and the changes before the same last ride line up from row to row; a ring wider than its wait grows back over the ride before it instead. The bar of each ride beside it runs on under the pill to its centre, so the pill's rounded ends always cover the join and no corner of a ride shows beside the curve; what shows of a ride is still its own minutes. Empty when the change's station is known, `?` when the station is unknown: the `guess` operation leaves it out (`station: null`) because the player has not guessed that station yet. The word is "unknown" / "onbekend" everywhere; "mystery" is kept for the one station the puzzle asks for.
- **Close changes.** Rings never cover each other. Worked from the mystery bar outwards, a change sits at least 6px (`minRideShowPx`) clear of the bar or of the change after it, so a two-minute ride between two changes still shows a sliver of its colour; one that would overlap moves away from the bar, and the guess dot moves past the farthest change, 6px clear of it. Only these short rides leave the scale.
- **Ride labels.** Inside each ride, in `on-line` bold 13px, centred in the part the dot, rings and bar leave visible: the train and its time ("IC 2h 02m") when it fits, else the time alone ("30m"), else nothing. Whether a label fits is worked out at about 7.2px a character plus 10px padding, on the track's measured width (`useElementWidth`, `src/lib/use-element-width.ts`, a `ResizeObserver`). The server render, before the browser has measured it, assumes the narrowest track, 340px at phone width, so a wide track can gain train names once the page loads.
- **Guess dot.** A 22px ink dot with a 3px `bg` halo, centred on the start of the first ride.

## Trip details

A short ride has no room for its label, and a train code such as `SPR` means nothing to a player who does not know it. So every trip line is a button (`GuessTrack`, `src/components/game/guess-track.tsx`) named "Trip from Maastricht, ride by ride" / "Reis vanaf Maastricht, rit voor rit" that shows the trip in full. A correct guess has no line and no button.

`TripDetails` (`src/components/game/trip-details.tsx`) draws it as the line turned on its side, top to bottom: the guessed station with the guess dot; each ride with its code in a chip of its line colour, the label spelled out (`trainName` in `src/lib/game/trip-text.ts`, from the `trains` messages): the train type in `nl` ("Sprinter", "Intercity direct", "Stopping train" / "Stoptrein"), the operator in `gb` ("LNER" for `GR`, "Lumo" for `LD`, "Thameslink" for `TL`; brand names, the same in both languages). Its map is a `Record` over `trainTypeSchema`, so a label added there fails the typecheck until it has a name and its time at the right; each change as a ring with its station and its wait ("6m to change" / "6m overstaptijd"); and the mystery station under a plain ink disc. A change the player has not found stays "Unknown station" / "Onbekend station" with a `?` ring, as on the line; the `?` only ever marks an unknown change, never the mystery station. `TripDetailsRail` draws each stop's piece of the vertical line, the arriving ride's colour above and the leaving one's below.

Where it opens depends on the pointer (`useMediaQuery`, `src/lib/use-media-query.ts`, on `(hover: hover) and (pointer: fine)`):

- **Mouse or trackpad.** A popover under the line, aligned to its right end: hovering opens it after 150ms, and focus with Enter or a click opens it too. It is headed "From Maastricht" / "Vanaf Maastricht" with the total time below ("2h 25m to the mystery station").
- **Touch.** A tap opens the details inside the row, under the line, full width; another tap closes them. A popover would cover the rows below on a phone and has no hover to open it. The button carries `aria-expanded` and `aria-controls`.

The server render and the first paint assume touch, so the page hydrates the same everywhere; a mouse switches to the popover straight after.

## A new guess

A guess just made on the page arrives as a train ride. The row gets `guess-enter` (`GuessRow`'s `entering`); the keyframes live in `src/styles.css`, and `TripLine` sets the timings on the elements as CSS variables.

1. **The row opens** at the top of the list (260ms, `max-height` and opacity), pushing the older guesses down rather than jumping them.
2. **The guess dot lands** on the guessed station from 180ms, scaling up with a small overshoot (220ms).
3. **The train runs** from 320ms: the rides are uncovered from the dot to the mystery bar (`clip-path`), easing in and out like a train pulling away and braking (an ease-in-out sine). The run takes longer the longer the line, `tripRunMs` in `src/lib/game/trip-line.ts`: 300ms plus 7ms per percent of track, so about 0.4s for the shortest trip and 1s across the whole track. How long it takes says how far the guess is.
4. **Each change drops in** as the train arrives at its station, with the dot's overshoot. `trainReachesMs` works out when: the inverse of the run's easing at the change's left end.
5. **The labels fade in** as the train arrives (180ms).

A correct guess has no line; its row only opens. Kept guesses, the ones a reload shows, never move: only the answer to the last guess made on the page enters (`useGame`'s `lastAnswer`). With `prefers-reduced-motion: reduce` nothing moves; the row is drawn as it ends.

## Time grid and mystery bar

Behind each track, a 1px `grid` rule every 30 minutes of the board's scale, counted from the right: every fifth of the track at 2h 30. Below the list, the grid's labels sit under their rules (`gridMarks`): "30 min", "1 h", "1 h 30", "2 h" (Dutch "1 u", "1 u 30", "2 u"), and on to "2 h 30", "3 h" on a longer board. Past six columns only the whole hours are labelled, so the labels never crowd at phone width. Above the list on the right, "Mystery station" / "Mysteriestation" names the bar: a 26px `surface` pill with a 4px ink border, from the first row's line to the last.

`MysteryBar` (`src/components/game/mystery-bar.tsx`) measures the centres of the first and last track areas (`data-trip-end`), extending 15px beyond each. A single row gets a 30px end cap centred on its line. It measures before paint and uses `ResizeObserver` on the list, rows and track areas to follow wrapping, font changes and the arrival animation. Until measured, the bar is hidden. The How to play example uses this same placement, so its bar stays on the trip line when the station text wraps above it.

## Revealed

On the solved and missed screen ([game.md](game.md#solved-and-missed)) the list is the design's Web · Solved "How you got there", given the `reveal` operation's guesses, so every change is named and no `?` shows:

- **The header.** "How you got there" / "Zo kwam je er" as an `h2` in Barlow Condensed bold 32px, and at the right in muted 15px "Newest first. Every change is revealed now." / "Nieuwste eerst. Elke overstap is nu onthuld." No progress and no "Mystery station" label.
- **The rows.** 96px high, the station in 28px, and no time grid behind the track or labels below the list. The trip lines are drawn as on the playing board, on the same scale.
- **The correct guess.** One 80px line: the number and the station in 30px at the left, "You're here" / "Hier ben je" in semibold 15px at the right, clear of the bar.
- **The mystery bar.** Filled `ink`, no border: the station is known. It follows the same measured endpoints as the playing board, using the correct row's centre when there is no trip line. A first-guess win gets a centred 30px end cap.

## Legend

`GameLegend` (`src/components/game/game-legend.tsx`) is the key the playing page's footer shows ([site-shell.md](site-shell.md#footer)): the guess dot "Your guess", a `line-1` swatch "Train and ride time", an empty ring "Change, station known" and a `?` ring "Change, station unknown" / "Overstap, station onbekend". It is a list named "Legend" / "Legenda"; the swatches are hidden from screen readers. `PlayingFooterLegend` sets the countdown to the next station beside it ([game.md](game.md#countdown)).

## Screen readers

The drawing is hidden (`aria-hidden`), inside the button that opens the [trip details](#trip-details), which are text; each row carries its whole trip as one visually hidden sentence instead (`spokenGuess` in `src/lib/game/trip-text.ts`), so a screen reader reads the row once, in words:

> Guess 4, Maastricht: 2 hours 25 minutes to the mystery station. IC, 2 hours 2 minutes, change at Utrecht Centraal, 6 minutes, IC, 17 minutes.

Times in the sentence spell out their units, one and many ("1 hour 1 minute", "1 uur 1 minuut"), because a reader would say the visible `25m` as metres. An unknown change reads "change at an unknown station" / "overstap op een onbekend station". A correct guess reads "Guess 5, Amersfoort Centraal: the mystery station." The list itself is an `<ol>` named "Your guesses" / "Je gokken".

## Tests

- `src/lib/game/trip-line.test.ts` covers the width and its limits, the board's scale and its grid labels, 29 minutes one width beside a 3-hour trip, where each ride and change sits, the same minutes drawn the same width with a change or without and whatever the wait after them, the labels that fit on a narrow and a wide track, close changes kept apart with the dot past them, unknown changes and the line colours.
- `src/lib/game/trip-text.test.ts` covers the short and the spoken times, the summary and the sentence, in both languages.
- `src/components/game/guess-list.test.tsx` renders the design's four guesses in `happy-dom`: the order, each row's sentence, the drawing hidden and each line's button, the trip details opening in the row on a touch screen and in a popover with a mouse (in Dutch), the labels and `?`, the grid labels and their whole hours on a board widened by a 3-hour trip, Dutch, a correct guess, the entering row's class and timings, the revealed list's heading, its found row and no grid, in both languages, and the empty list.
- `src/components/game/mystery-bar.test.tsx` supplies layout measurements to check the centred cap for a first-guess win, the wrapped example and its resize, and the span between endpoints when another row arrives.
