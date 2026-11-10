# Sharing a result

Once a game is over the solved or missed screen ([game.md](game.md#solved-and-missed)) offers to share it, after the design's Web · Solved board: the **Share result** button beside "Play an older puzzle" under the answer plate, and **What you'll share** under "How you got there", showing the text exactly as it will go out. `GameOver` writes the text from the kept guesses, so it is there before the reveal answers. The text draws how the player closed in without ever naming a station, so it never gives the answer away.

## The text

`shareText` (`src/lib/game/share-text.ts`) writes it in the page's locale:

```
Trackdown NL 142, 5/6
●━━━━━━━━○━  2h25
●━━━━━○━━    1h57
●━           17m
●━           13m
Tracked down in 5
https://trackdown.nl/en/nl
```

- **Header.** "Trackdown", the network's id in capitals, the puzzle number and the score: the guesses used out of the puzzle's `maxGuesses`, or `X/6` for a lost game.
- **Grid.** One line per wrong guess, oldest first (the guess list shows them newest first). Each starts with `●`, the guess; every ride is a run of `━`, one per 15 minutes rounded, at least one; every change is a `○`, whether its station is known or not. The trip's total follows, two spaces past the longest line so the times line up: `2h25`, `17m` (`2u25` in Dutch).
- **Footer.** "Tracked down in 5" / "Gevonden in 5", or "Not tracked down" / "Niet gevonden".
- **Link.** The network's game in the page's language, so a friend plays the same network's puzzle, whatever network they chose themselves: `https://trackdown.nl/nl` in Dutch, `https://trackdown.nl/en/nl` in English (the `share.url` message, given the network, [network-picker.md](network-picker.md#routes)). It is part of the text, so the clipboard and the preview carry the same thing.

The correct guess has no trip, so it has no line; the score and footer count it. Station names and codes never appear: the grid holds only its marks and times.

## Sharing

The Share result button copies the text and nothing else. It never opens the device's share sheet (the Web Share API): the sheet got in the way of pasting the result where the player wanted it.

A successful copy emits `result_shared` with puzzle metadata and the method `copied`, never the shared text. A failed copy emits no game event ([analytics.md](analytics.md#game-events)).

`ShareButton` (`src/components/game/share-button.tsx`) hands the text to `shareResult` (`src/lib/game/share-result.ts`):

- **Clipboard.** `navigator.clipboard.writeText` copies it, and a status line on its own row under the buttons says "Copied. Paste it wherever you like." / "Gekopieerd. Plak het waar je maar wilt."
- **No clipboard.** Without a clipboard (an insecure context) or when copying is refused, the status line asks the player to select the text in the preview and copy it themselves.

The status line is a `role="status"` region, so screen readers announce it. The button is disabled while a copy is under way.

## The preview

`SharePreview` (`src/components/game/share-preview.tsx`) is the design's "What you'll share": an `h2`, the text in a `pre` on the `surface` colour with a `rule` border, in Barlow at 17px, and a muted line on why it holds no station names. It shows the same string the button copies. Wide grids scroll inside the box at phone width.

## Tests

- `src/lib/game/share-text.test.ts`: times, lines, the grid's alignment, the design's text for a won game, a lost game, Dutch, and that no station name or code ends up in the text.
- `src/lib/game/share-result.test.ts`: a copy, a share sheet left closed, no clipboard and a refused copy.
- `src/components/game/game-page.test.tsx`: no share while playing, the preview on a won game, copying a lost and a won game with the share sheet left closed, and a copy that fails.
