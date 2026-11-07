# Design system

The design is the Trackdown design canvas: its Brand board (logo, palette, type) and the Web · Playing and Web · Solved boards, each in light and dark. Its tokens live in `src/styles.css`, and Tailwind exposes them as utilities. A page that sticks to the utilities below cannot drift from the design.

Where the design draws something, the site draws the same. The defaults further down are for what the design does not draw.

## Colour

`src/styles.css` declares the design's colours as `--td-*` custom properties on `:root`, with the values of the canvas's `t` object, and declares them again for dark mode. The shadcn/ui roles (`--background`, `--primary`, …) point at them, so every shadcn component is dressed in the design.

| Token | Light | Dark | Utility | Use |
| --- | --- | --- | --- | --- |
| `bg` | `#F6F7F5` | `#14181D` | `bg-background` | Map paper, the page |
| `surface` | `#FFFFFF` | `#1D2329` | `bg-surface`, `bg-card`, `bg-popover` | The guess input, the suggestion list, the mystery bar |
| `rule` | `#D9DDDA` | `#2E363E` | `border-border`, `border-rule` | Hairlines between guesses, above the footer |
| `ink` | `#15181C` | `#EEF1EE` | `text-foreground`, `text-ink`, `border-input` | Text, guess dots, the input's and picker's border |
| `muted` | `#4C535A` | `#A3ABB3` | `text-muted-foreground` | Secondary text: the date, the lead, summaries, axis labels |
| `soft` | `#EEF0EE` | `#262D35` | `bg-soft`, `bg-muted`, `bg-accent`, `bg-secondary` | The highlighted suggestion |
| `empty` | `#C4C9C5` | `#4A535C` | `bg-empty`, `border-empty` | Guesses not yet made in the progress dots |
| `grid` | `#E1E5E2` | `#262D35` | `bg-grid` | The 30-minute grid behind the trip lines |
| `line-1` | `#2F45D8` | `#8394FF` | `bg-line-1` | First train |
| `line-2` | `#B8236F` | `#F27AB6` | `bg-line-2` | After the first change |
| `line-3` | `#0B7F5A` | `#4FD3A0` | `bg-line-3` | After the second change |
| `on-line` | `#FFFFFF` | `#14181D` | `text-on-line` | Ride times inside a line |
| `action` | `#15181C` | `#EEF1EE` | `bg-primary`, `bg-action` | The Guess button |
| `on-action` | `#FFFFFF` | `#14181D` | `text-primary-foreground`, `text-on-action` | Its label |

The design's `muted` is a text colour, while shadcn's `muted` is a tint. So the design's `muted` is `text-muted-foreground`, and `bg-muted` is the design's `soft`. There is no `text-muted` for secondary text.

The suggestion list's shadow is `shadow-popover` (`0 16px 40px`, ink at 14% in light, black at 50% in dark).

```tsx
// Do
<p className="text-muted-foreground">…</p>
<span className="bg-line-2 text-on-line">17m</span>
// Don't: raw colours, which skip dark mode
<p className="text-[#4C535A]">…</p>
```

### The three line colours are for trips only

`line-1`, `line-2` and `line-3` colour the train segments of a trip, in order of the changes. They are not status, brand or decoration colours. The one exception is the logo, which the design draws in `line-1` and `line-2`.

### Dark mode

Dark mode follows the operating system (`prefers-color-scheme`). There is no theme toggle. The `dark:` variant uses the same media query, but a component rarely needs it: every utility above already switches, because the tokens do.

### Contrast

Every text colour passes 4.5:1 on every ground the design sets it on, in both modes. `src/lib/theme-contrast.test.ts` reads the values from `src/styles.css` and fails `bun run test` if a pair drops below that. The pairs are ink, muted, line 1 and the error red on bg, surface and soft, on-line on each line, on-action on action, and bg on ink (the `NL` chip and the mystery `?`). A new text colour, or a new ground for one, goes into that list.

The lowest pairs are on-line on `line-3` in light (5.0:1) and line 1 on `soft` in dark (5.1:1).

## Typography

Both fonts are self-hosted through `@fontsource` (`@fontsource/barlow`, `@fontsource/barlow-condensed`), imported at the top of `src/styles.css`. Vite bundles the font files, so the site makes no request to Google Fonts. Each weight's CSS covers the Latin, Latin Extended and Vietnamese subsets by `unicode-range`; a browser downloads only the subsets a page uses.

| Family | Utility | Weights | Use |
| --- | --- | --- | --- |
| Barlow | `font-sans` (the body's default) | 400, 500, 600, 700, 800 | Body, UI, times, labels |
| Barlow Condensed | `font-condensed` | 700, 800 | Station names (700), the wordmark and the page title (800) |

The body sets `tabular-nums`, so times in a column line up, as the design draws them.

## Shape

`--radius` is 12px; the scale gives 8px (`rounded-sm`), 10px for buttons and list options (`rounded-md`), 12px (`rounded-lg`) and 16px for the input and plates (`rounded-xl`). The network picker and chips are pills (`rounded-full`). See [getting-started.md](getting-started.md#shadcnui) for the sizes of controls.

## Defaults for what the design does not draw

| What | Default | Why |
| --- | --- | --- |
| Focus ring (`ring`) | `line-1`, a 3px `:focus-visible` outline 3px off the element ([site-shell.md](site-shell.md#focus-ring)) | The brand sheet's link colour; it passes 3:1 against bg and surface in both modes |
| Links in running text | `line-1` | The same; it passes 4.5:1 on every ground |
| Errors (`destructive`) | `#B42318` light, `#FF8A7A` dark | The design has no error state; both pass 4.5:1 on bg, surface and soft |
| Disabled controls | shadcn's `opacity-50` | Disabled text is exempt from contrast rules |
| Secondary buttons | `bg-secondary` (`soft`), ink text | The same tint as the highlighted suggestion |
