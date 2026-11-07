# Station search

`StationSearch` (`src/components/game/station-search.tsx`) is the guess input of the design's Web · Playing board: a search box with the Guess button, and below it the stations the typed text matches. A player types part of a name, picks a station from the list and guesses it.

No page shows it yet: the game page, still to come, mounts it with the game's state.

## Props

| Prop | What it is |
| --- | --- |
| `stations` | Every station a player can guess: the `stations` operation's answer (`stationsQueryOptions(network, locale)`, [api.md](api.md#stations)), provinces already named in the page's locale |
| `guessed` | The codes of the stations guessed so far. They are never offered, and typing one out in full does not guess it again |
| `guessNumber`, `maxGuesses` | Which guess this is, from 1, and how many the puzzle allows (`maxGuesses` in `src/lib/game/rules.ts`). The placeholder reads "Raad station 5 van 6" / "Guess station 5 of 6" |
| `onGuess` | Called with the station guessed. The search then empties itself |

## Matching

`src/lib/game/station-search.ts` holds the matching, with no data, so it runs in the browser:

- **Folding.** `foldForSearch` lowers the case, drops diacritics (`â` is `a`, `ë` is `e`) and turns every run of characters that are neither letters nor digits into one space, in the name and in the query alike. So `s hert` finds `'s-Hertogenbosch` and `hoogezand sap` finds `Hoogezand-Sappemeer`.
- **Any word start.** `matchName` matches the folded query at the start of any word of the folded name, never inside a word: `zuid` finds Amsterdam Zuid, `ster` finds nothing. It returns the match as offsets into the original name, so the list sets exactly the typed part in bold.
- **Order.** `searchStations` lists the names that start with the query first, then the names where a later word does; otherwise in `stations.json`'s order, by name. `ams` offers Amstel, then Amsterdam Bijlmer ArenA, Centraal, Sloterdijk, Zuid and the rest. The list has no limit; six options show at once and the rest scroll.
- **Typed out in full.** `findStationByName` finds the station whose folded name is the whole folded text, so a player who types `amsterdam zuid` and presses Guess guesses it without picking. Part of a name guesses nothing: the list opens to show what it matches.

## Keyboard and screen readers

The search is shadcn/ui's combobox on Base UI's `Combobox`, which follows the ARIA combobox pattern: the input has `role="combobox"`, the list `role="listbox"` labelled "Passende stations" / "Matching stations", each station `role="option"`, and the highlighted option is the input's `aria-activedescendant`.

- **Typing** opens the list, with the first match highlighted (`autoHighlight`). An empty input shows no list.
- **Arrow keys** move the highlight; **Enter** picks the highlighted station and fills the input with its name; **Enter** again, or the Guess button, guesses it.
- **Escape** closes the list and keeps the typed text. So does a click outside: Base UI would empty an input whose text was not picked, and `StationSearch` ignores that reset (`input-clear`) so a name typed out in full survives the click on Guess.
- The input's name is the visually hidden label "Raad een station" / "Guess a station". Each option's name is the station and its province, "Amsterdam Centraal, Noord-Holland", so a screen reader reads the province shown beside it as a separate phrase.
- When nothing matches, the list says so: "Geen station gevonden voor „xyz”" / "No station matches “xyz”".
- Focus shows the site's ring ([site-shell.md](site-shell.md#focus-ring)) around the whole box, not the bare input inside it.

## Look

The design's sizes, from [design-system.md](design-system.md): the box is `surface` with a 2px ink border (`border-input`) and 16px corners, the input 20px medium text, the Guess button `Button size="lg"`. The list is a `surface` plate with the same border and corners and `shadow-popover`, as wide as the box, 6px below it. Each option is 52px high with 10px corners, the name in 18px with the typed part bold, the province in 15px `text-muted-foreground` at the right; the highlighted option takes `bg-soft`.

## The combobox parts

`bunx shadcn add combobox` (base-vega) adds one file with every part and rewrites `button.tsx`. The site keeps only the parts the search uses, one per file in `src/components/ui/`, dressed in the design: `combobox.ts` (the root), `combobox-input.tsx` (a bare input, no input group: the search draws its own box), `combobox-content.tsx`, `combobox-list.tsx`, `combobox-item.tsx` (no check mark) and `combobox-empty.tsx`.

## Tests

- `src/lib/game/station-search.test.ts` covers folding, word starts, the order and the full-name lookup.
- `src/components/game/station-search.test.tsx` renders the search in `happy-dom` with Testing Library and drives it with `user-event`: the label and placeholder in both languages, `ams`, guessed stations left out, arrow keys and Enter, Escape, a full name and the Guess button, no match.
