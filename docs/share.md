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
https://trackdown.nl/en
```

- **Header.** "Trackdown", the network's id in capitals, the puzzle number and the score: the guesses used out of the puzzle's `maxGuesses`, or `X/6` for a lost game.
- **Grid.** One line per wrong guess, oldest first (the guess list shows them newest first). Each starts with `●`, the guess; every ride is a run of `━`, one per 15 minutes rounded, at least one; every change is a `○`, whether its station is known or not. The trip's total follows, two spaces past the longest line so the times line up: `2h25`, `17m` (`2u25` in Dutch).
- **Footer.** "Tracked down in 5" / "Gevonden in 5", or "Not tracked down" / "Niet gevonden".
- **Link.** The site in the page's language, so a friend can play too: `https://trackdown.nl` in Dutch, `https://trackdown.nl/en` in English (the `share.url` message). It is part of the text, not the Web Share API's `url`, so the share sheet, the clipboard and the preview all carry the same thing.

The correct guess has no trip, so it has no line; the score and footer count it. Station names and codes never appear: the grid holds only its marks and times.

## Sharing

`ShareButton` (`src/components/game/share-button.tsx`) hands the text to `shareResult` (`src/lib/game/share-result.ts`):

- **Web Share API.** Where `navigator.share` exists and `navigator.canShare({ text })` allows it, the device's share sheet opens with the text. A player closing the sheet (`AbortError`) is left alone. Any other refusal falls through to the clipboard.
- **Clipboard.** Otherwise `navigator.clipboard.writeText` copies it, and a status line on its own row under the buttons says "Copied. Paste it wherever you like." / "Gekopieerd. Plak het waar je maar wilt."
- **Neither.** Without a clipboard (an insecure context) or when copying is refused, the status line asks the player to select the text in the preview and copy it themselves.

The status line is a `role="status"` region, so screen readers announce it. The button is disabled while a share is under way.

## The preview

`SharePreview` (`src/components/game/share-preview.tsx`) is the design's "What you'll share": an `h2`, the text in a `pre` on the `surface` colour with a `rule` border, in Barlow at 17px, and a muted line on why it holds no station names. It shows the same string the button shares. Wide grids scroll inside the box at phone width.

## Tests

- `src/lib/game/share-text.test.ts`: times, lines, the grid's alignment, the design's text for a won game, a lost game, Dutch, and that no station name or code ends up in the text.
- `src/lib/game/share-result.test.ts`: the share sheet, a closed sheet, a refused sheet, `canShare` saying no, no Web Share API, no clipboard and a refused copy.
- `src/components/game/game-page.test.tsx`: no share while playing, the preview on a won game, sharing through the sheet, copying without the Web Share API, and a copy that fails.
