import { m } from "@/paraglide/messages";

/**
 * The key to the trip lines, from the footer of the design's Web · Playing
 * board: the guess dot, a ride, a known change and a hidden one. A playing
 * route names it as its `staticData.footerLegend` (docs/site-shell.md#footer).
 */
export function GameLegend() {
    return (
        <ul
            aria-label={m["legend.label"]()}
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
        >
            <li className="flex items-center gap-2">
                <span aria-hidden="true" className="size-3.5 rounded-full bg-ink" />
                {m["legend.guess"]()}
            </li>
            <li className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-7 bg-line-1" />
                {m["legend.ride"]()}
            </li>
            <li className="flex items-center gap-2">
                <span
                    aria-hidden="true"
                    className="size-[18px] rounded-full border-3 border-ink bg-surface"
                />
                {m["legend.changeKnown"]()}
            </li>
            <li className="flex items-center gap-2">
                <span
                    aria-hidden="true"
                    className="flex size-[18px] items-center justify-center rounded-full border-3 border-ink bg-surface text-[10px] font-extrabold text-ink"
                >
                    ?
                </span>
                {m["legend.changeUnknown"]()}
            </li>
        </ul>
    );
}
