import { describe, expect, it, vi } from "vitest";
import { shareResult } from "@/lib/game/share-result";

describe("shareResult", () => {
    it("copies the text to the clipboard", async () => {
        const writeText = vi.fn(() => Promise.resolve());

        expect(await shareResult("result", { clipboard: { writeText } })).toBe(
            "copied",
        );
        expect(writeText).toHaveBeenCalledWith("result");
    });

    it("copies where there is a share sheet, and leaves it closed", async () => {
        const share = vi.fn(() => Promise.resolve());
        const writeText = vi.fn(() => Promise.resolve());

        // A real `navigator` carries `share` beside its clipboard.
        const target = { share, clipboard: { writeText } };

        expect(await shareResult("result", target)).toBe("copied");
        expect(share).not.toHaveBeenCalled();
        expect(writeText).toHaveBeenCalledWith("result");
    });

    it("fails without a clipboard, or when copying is refused", async () => {
        expect(await shareResult("result", {})).toBe("failed");
        expect(
            await shareResult("result", {
                clipboard: { writeText: () => Promise.reject(new Error("denied")) },
            }),
        ).toBe("failed");
    });
});
