import { GameLegend } from "@/components/game/game-legend";
import { NextPuzzleCountdown } from "@/components/game/next-puzzle-countdown";
import { todayNetwork } from "@/lib/game/today-network";

/**
 * What the game page's footer shows above its links, after the design's
 * Web · Playing board: the line legend, and opposite it the countdown to
 * the next puzzle. The home route names it as its `staticData.footerLegend`
 * (docs/site-shell.md#footer); both sit in the footer's row of their own.
 */
export function PlayingFooterLegend() {
    return (
        <>
            <GameLegend />
            <NextPuzzleCountdown network={todayNetwork} />
        </>
    );
}
