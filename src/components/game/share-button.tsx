import { Share } from "lucide-react";
import { useState } from "react";
import { m } from "@/paraglide/messages";
import { Button } from "@/components/ui/button";
import type { PuzzleEventProperties } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { shareResult } from "@/lib/game/share-result";
import type { ShareNavigator, ShareOutcome } from "@/lib/game/share-result";

type ShareButtonProps = {
    /** What is shared: `shareText`'s answer, as the preview shows it. */
    text: string;
    /** Safe puzzle metadata, separate from the text being shared. */
    puzzle: PuzzleEventProperties;
    /** Where it goes; the browser's `navigator` unless a test hands its own. */
    target?: ShareNavigator | undefined;
};

function outcomeMessage(outcome: ShareOutcome | null): string {
    if (outcome === "copied") {
        return m["share.copied"]();
    }
    if (outcome === "failed") {
        return m["share.failed"]();
    }
    return "";
}

/**
 * The design's Share result button (docs/share.md#sharing): opens the
 * device's share sheet, or copies the text where there is none. Made for a
 * wrapping row of buttons: its status line takes a row of its own under
 * them, and is only there once it has something to say.
 */
export function ShareButton({ text, puzzle, target }: ShareButtonProps) {
    const [outcome, setOutcome] = useState<ShareOutcome | null>(null);
    const [isSharing, setIsSharing] = useState(false);

    async function share() {
        setIsSharing(true);
        setOutcome(null);
        const result = await shareResult(text, target ?? navigator);
        setOutcome(result);
        setIsSharing(false);
        if (result === "shared" || result === "copied") {
            trackEvent("result_shared", { ...puzzle, method: result });
        }
    }

    return (
        <>
            <Button
                size="lg"
                className="rounded-lg"
                disabled={isSharing}
                onClick={() => {
                    void share();
                }}
            >
                <Share aria-hidden="true" className="size-[18px]" />
                {m["gameOver.share"]()}
            </Button>
            <p
                role="status"
                className="order-last basis-full text-base text-muted-foreground empty:hidden"
            >
                {outcomeMessage(outcome)}
            </p>
        </>
    );
}
