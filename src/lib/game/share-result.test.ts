import { describe, expect, it, vi } from "vitest";
import { shareResult } from "@/lib/game/share-result";

function abort(): Error {
    const error = new Error("Share canceled");
    error.name = "AbortError";
    return error;
}

describe("shareResult", () => {
    it("hands the text to the share sheet where there is one", async () => {
        const share = vi.fn(() => Promise.resolve());
        const writeText = vi.fn(() => Promise.resolve());

        expect(
            await shareResult("result", { share, clipboard: { writeText } }),
        ).toBe("shared");
        expect(share).toHaveBeenCalledWith({ text: "result" });
        expect(writeText).not.toHaveBeenCalled();
    });

    it("copies nothing when the player closes the sheet", async () => {
        const writeText = vi.fn(() => Promise.resolve());

        expect(
            await shareResult("result", {
                share: () => Promise.reject(abort()),
                clipboard: { writeText },
            }),
        ).toBe("cancelled");
        expect(writeText).not.toHaveBeenCalled();
    });

    it("copies when the sheet refuses", async () => {
        const writeText = vi.fn(() => Promise.resolve());

        expect(
            await shareResult("result", {
                share: () => Promise.reject(new Error("NotAllowedError")),
                clipboard: { writeText },
            }),
        ).toBe("copied");
        expect(writeText).toHaveBeenCalledWith("result");
    });

    it("copies when the browser cannot share text", async () => {
        const share = vi.fn(() => Promise.resolve());
        const writeText = vi.fn(() => Promise.resolve());

        expect(
            await shareResult("result", {
                share,
                canShare: () => false,
                clipboard: { writeText },
            }),
        ).toBe("copied");
        expect(share).not.toHaveBeenCalled();
    });

    it("copies without the Web Share API", async () => {
        const writeText = vi.fn(() => Promise.resolve());

        expect(await shareResult("result", { clipboard: { writeText } })).toBe(
            "copied",
        );
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
