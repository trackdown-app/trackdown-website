// Copies the share text to the clipboard (docs/share.md#sharing). Never opens
// the device's share sheet. Holds no messages; the button says what happened.

/** The part of `navigator` sharing uses, missing where the browser lacks it. */
export type ShareNavigator = {
    clipboard?: Pick<Clipboard, "writeText">;
};

/** How it went: copied to the clipboard, or not. */
export type ShareOutcome = "copied" | "failed";

/**
 * Copies `text` to `target`'s clipboard. Fails without a clipboard (an
 * insecure context) or when the browser refuses the copy.
 */
export async function shareResult(
    text: string,
    target: ShareNavigator,
): Promise<ShareOutcome> {
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
