import { GameLegend } from "@/components/game/game-legend";
import { NextPuzzleCountdown } from "@/components/game/next-puzzle-countdown";
import { useCurrentNetwork } from "@/lib/use-current-network";

/**
 * What the game page's footer shows above its links, after the design's
 * Web · Playing board: the line legend, and opposite it the countdown to
 * the network's next puzzle. The game route names it as its
 * `staticData.footerLegend` (docs/site-shell.md#footer); both sit in the
 * footer's row of their own.
 */
export function PlayingFooterLegend() {
    const network = useCurrentNetwork();
    return (
        <>
            <GameLegend />
            <NextPuzzleCountdown network={network} />
        </>
    );
}
