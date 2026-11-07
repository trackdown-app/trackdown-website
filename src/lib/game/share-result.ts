// Hands the share text to the device (docs/share.md#sharing): the Web Share
// API where there is one, else the clipboard. Holds no messages; the button
// says what happened.

/** The parts of `navigator` sharing uses, each missing where the browser lacks it. */
export type ShareNavigator = {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data?: ShareData) => boolean;
    clipboard?: Pick<Clipboard, "writeText">;
};

/**
 * How it went: handed to the share sheet, copied to the clipboard, closed by
 * the player, or neither way worked.
 */
export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

function canShareText(target: ShareNavigator, data: ShareData): boolean {
    if (target.share == null) {
        return false;
    }
    return target.canShare == null || target.canShare(data);
}

/**
 * Shares `text` through `target`'s share sheet, or copies it when there is
 * none or the sheet refuses it. A player closing the sheet is not a failure
 * and copies nothing.
 */
export async function shareResult(
    text: string,
    target: ShareNavigator,
): Promise<ShareOutcome> {
    const data: ShareData = { text };
    if (canShareText(target, data) && target.share != null) {
        try {
            await target.share(data);
            return "shared";
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                return "cancelled";
            }
            // Refused (no user gesture, not allowed): copy instead.
        }
    }
    if (target.clipboard == null) {
        return "failed";
    }
    try {
        await target.clipboard.writeText(text);
        return "copied";
    } catch {
        return "failed";
    }
}
