// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { GuessList } from "@/components/game/guess-list";
import type { ListedGuess } from "@/lib/game/trip-line";

const wrongGuess: ListedGuess = {
    guess: "mt",
    correct: false,
    steps: [{ kind: "ride", train: "IC", minutes: 145 }],
    totalMinutes: 145,
};
const correctGuess: ListedGuess = {
    guess: "gvc",
    correct: true,
    steps: [],
    totalMinutes: 0,
};

/** Supply browser layout measurements; happy-dom does not lay out flex rows. */
function mockLayout(ends: { top: number; height: number }[]) {
    let onResize: (() => void) | undefined;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        function (this: HTMLElement) {
            if (this.tagName === "OL") {
                return new DOMRect(0, 100);
            }
            const markers = [...document.querySelectorAll("[data-trip-end]")];
            const end = ends[markers.indexOf(this)];
            return end == null
                ? new DOMRect()
                : new DOMRect(0, end.top, 0, end.height);
        },
    );
    vi.stubGlobal(
        "ResizeObserver",
        class {
            constructor(private callback: () => void) {}
            observe(target: Element) {
                if (target.tagName === "OL") {
                    onResize = this.callback;
                }
            }
            disconnect() {}
        },
    );
    return () => {
        if (onResize == null) {
            throw new Error("The mystery bar is not observing the list");
        }
        onResize();
    };
}

function bar(container: HTMLElement): HTMLElement {
    const element = container.querySelector<HTMLElement>(".z-2");
    if (element == null) {
        throw new Error("Missing mystery bar");
    }
    return element;
}

afterEach(cleanup);

describe("MysteryBar placement", () => {
    it("centres a short end cap on a first-guess win", () => {
        mockLayout([{ top: 100, height: 80 }]);
        const { container } = render(
            <GuessList guesses={[correctGuess]} stations={[]} revealed />,
        );

        expect(bar(container).style.top).toBe("25px");
        expect(bar(container).style.height).toBe("30px");
    });

    it("follows a single wrapped track instead of spanning the station text", () => {
        const ends = [{ top: 220, height: 72 }];
        const resize = mockLayout(ends);
        const { container } = render(
            <GuessList guesses={[wrongGuess]} stations={[]} />,
        );

        expect(bar(container).style.top).toBe("141px");
        expect(bar(container).style.height).toBe("30px");

        // A wider viewport puts the track beside the station again.
        ends[0] = { top: 100, height: 104 };
        act(resize);
        expect(bar(container).style.top).toBe("37px");
        expect(bar(container).style.height).toBe("30px");
    });

    it("spans actual endpoints and remeasures when another row arrives", () => {
        const ends = [{ top: 100, height: 80 }];
        mockLayout(ends);
        const { container, rerender } = render(
            <GuessList guesses={[correctGuess]} stations={[]} revealed />,
        );

        ends.push({ top: 200, height: 72 });
        rerender(
            <GuessList
                guesses={[wrongGuess, correctGuess]}
                stations={[]}
                revealed
            />,
        );
        expect(bar(container).style.top).toBe("25px");
        expect(bar(container).style.height).toBe("126px");
    });
});
