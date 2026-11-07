import { ShareIcon } from "lucide-react";
import { useState } from "react";
import { m } from "@/paraglide/messages";
import { Button } from "@/components/ui/button";
import { shareResult } from "@/lib/game/share-result";
import type { ShareNavigator, ShareOutcome } from "@/lib/game/share-result";

type ShareButtonProps = {
    /** What is shared: `shareText`'s answer, as the preview shows it. */
    text: string;
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
 * device's share sheet, or copies the text where there is none, and says
 * so under it.
 */
export function ShareButton({ text, target }: ShareButtonProps) {
    const [outcome, setOutcome] = useState<ShareOutcome | null>(null);
    const [isSharing, setIsSharing] = useState(false);

    async function share() {
        setIsSharing(true);
        setOutcome(null);
        const result = await shareResult(text, target ?? navigator);
        setOutcome(result);
        setIsSharing(false);
    }

    return (
        <div className="flex flex-col gap-3">
            <Button
                size="lg"
                className="self-start rounded-xl"
                disabled={isSharing}
                onClick={() => {
                    void share();
                }}
            >
                <ShareIcon aria-hidden="true" className="size-4.5" />
                {m["share.button"]()}
            </Button>
            <p
                role="status"
                className="text-base text-muted-foreground empty:hidden"
            >
                {outcomeMessage(outcome)}
            </p>
        </div>
    );
}
