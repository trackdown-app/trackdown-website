// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { GuessList } from "@/components/game/guess-list";
import type { ListedGuess } from "@/lib/game/trip-line";

const stations = [
    { code: "hvs", name: "Hilversum" },
    { code: "ut", name: "Utrecht Centraal" },
    { code: "hdr", name: "Den Helder" },
    { code: "mt", name: "Maastricht" },
];

// The design's four guesses, oldest first.
const guesses: ListedGuess[] = [
    {
        guess: "hvs",
        correct: false,
        steps: [{ kind: "ride", train: "IC", minutes: 13 }],
        totalMinutes: 13,
    },
    {
        guess: "ut",
        correct: false,
        steps: [{ kind: "ride", train: "IC", minutes: 17 }],
        totalMinutes: 17,
    },
    {
        guess: "hdr",
        correct: false,
        steps: [
            { kind: "ride", train: "IC", minutes: 72 },
            { kind: "change", station: null, minutes: 9 },
            { kind: "ride", train: "IC", minutes: 36 },
        ],
        totalMinutes: 117,
    },
    {
        guess: "mt",
        correct: false,
        steps: [
            { kind: "ride", train: "IC", minutes: 122 },
            { kind: "change", station: "ut", minutes: 6 },
            { kind: "ride", train: "IC", minutes: 17 },
        ],
        totalMinutes: 145,
    },
];

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

/** Makes the page a mouse's (`true`) or a touch screen's (`false`). */
function stubHover(canHover: boolean) {
    vi.stubGlobal("matchMedia", (query: string) => ({
        matches: canHover && query.includes("hover: hover"),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    }));
}

function rows(): HTMLElement[] {
    return within(screen.getByRole("list", { name: "Your guesses" })).getAllByRole(
        "listitem",
    );
}

describe("GuessList", () => {
    it("lists the guesses newest first, each read as one sentence", () => {
        overwriteGetLocale(() => "en");
        render(<GuessList guesses={guesses} stations={stations} />);

        const texts = rows().map(
            (row) => row.querySelector(".sr-only")?.textContent,
        );
        expect(texts).toEqual([
            "Guess 4, Maastricht: 2 hours 25 minutes to the mystery station. IC, 2 hours 2 minutes, change at Utrecht Centraal, 6 minutes, IC, 17 minutes.",
            "Guess 3, Den Helder: 1 hour 57 minutes to the mystery station. IC, 1 hour 12 minutes, change at an unknown station, 9 minutes, IC, 36 minutes.",
            "Guess 2, Utrecht Centraal: 17 minutes to the mystery station. IC, 17 minutes.",
            "Guess 1, Hilversum: 13 minutes to the mystery station. IC, 13 minutes.",
        ]);
    });

    it("hides the drawing from a screen reader", () => {
        overwriteGetLocale(() => "en");
        render(<GuessList guesses={guesses} stations={stations} />);

        for (const row of rows()) {
            const [text, track, ...rest] = [...row.children].filter(
                (child) => !child.classList.contains("sr-only"),
            );
            expect(rest).toEqual([]);
            expect(text?.getAttribute("aria-hidden")).toBe("true");
            // The track is the button that opens the details; its line is drawn only.
            const button = track?.querySelector("button");
            expect(
                button?.querySelector(':scope > span[aria-hidden="true"]'),
            ).not.toBeNull();
            // Named by its text, never `aria-label`, which would leave out the
            // ride labels drawn on the line (axe's label-content-name-mismatch).
            expect(button?.hasAttribute("aria-label")).toBe(false);
        }
        for (const station of [
            "Maastricht",
            "Den Helder",
            "Utrecht Centraal",
            "Hilversum",
        ]) {
            expect(
                screen.getByRole("button", {
                    name: `Trip from ${station}, ride by ride`,
                }),
            ).toBeDefined();
        }
    });

    it("opens a trip's details in the row on a touch screen", () => {
        overwriteGetLocale(() => "en");
        stubHover(false);
        render(<GuessList guesses={guesses} stations={stations} />);

        const button = screen.getByRole("button", {
            name: "Trip from Den Helder, ride by ride",
        });
        expect(button.getAttribute("aria-expanded")).toBe("false");
        fireEvent.click(button);
        expect(button.getAttribute("aria-expanded")).toBe("true");

        const panelId = button.getAttribute("aria-controls") ?? "";
        const panel = document.getElementById(panelId);
        expect(panel?.closest("li")?.textContent).toContain("Den Helder");
        expect(
            within(panel ?? document.body)
                .getAllByRole("listitem")
                .map((item) => item.textContent),
        ).toEqual([
            "Den Helder",
            "ICIntercity1h 12m",
            "?Unknown station9m to change",
            "ICIntercity36m",
            "?Mystery station",
        ]);

        fireEvent.click(button);
        expect(document.getElementById(panelId)).toBeNull();
    });

    it("opens a trip's details in a popover with a mouse, in Dutch", async () => {
        overwriteGetLocale(() => "nl");
        stubHover(true);
        render(<GuessList guesses={guesses} stations={stations} />);

        fireEvent.click(
            screen.getByRole("button", {
                name: "Reis vanaf Maastricht, rit voor rit",
            }),
        );
        const popup = await screen.findByRole("dialog");
        expect(popup.textContent).toContain("Vanaf Maastricht");
        expect(popup.textContent).toContain("2u 25m naar het mysteriestation");
        expect(popup.textContent).toContain("Utrecht Centraal6m overstaptijd");
        expect(popup.textContent).not.toContain("?Onbekend");
    });

    it("shows the summary, the ride labels that fit and a ? for an unknown change", () => {
        overwriteGetLocale(() => "en");
        render(<GuessList guesses={guesses} stations={stations} />);

        const [maastricht, denHelder] = rows();
        expect(maastricht?.textContent).toContain(
            "2h 25m, change at Utrecht Centraal",
        );
        expect(maastricht?.textContent).toContain("IC 2h 02m");
        expect(maastricht?.textContent).not.toContain("?");
        expect(denHelder?.textContent).toContain("IC 1h 12m");
        expect(denHelder?.textContent).toContain("IC 36m");
        expect(denHelder?.textContent).toContain("?");
    });

    it("labels the time grid and the mystery station", () => {
        overwriteGetLocale(() => "en");
        const { container } = render(
            <GuessList guesses={guesses} stations={stations} />,
        );

        expect(container.textContent).toContain("Mystery station");
        for (const label of ["30 min", "1 h", "1 h 30", "2 h"]) {
            expect(container.textContent).toContain(label);
        }
    });

    it("widens the grid for a trip past 2h 30, on one scale for every row", () => {
        render(
            <GuessList
                guesses={[
                    ...guesses,
                    {
                        guess: "vs",
                        correct: false,
                        steps: [{ kind: "ride", train: "IC", minutes: 183 }],
                        totalMinutes: 183,
                    },
                ]}
                stations={[...stations, { code: "vs", name: "Vlissingen" }]}
            />,
        );

        // Seven columns of 30 minutes: only the whole hours are labelled.
        const labels = [
            ...document.querySelectorAll("[aria-hidden] .absolute.top-2"),
        ];
        expect(labels.map((label) => label.textContent)).toEqual([
            "1 u",
            "2 u",
            "3 u",
        ]);
    });

    it("speaks Dutch by default", () => {
        render(<GuessList guesses={guesses} stations={stations} />);

        expect(screen.getByRole("list", { name: "Je gokken" })).toBeDefined();
        expect(screen.getByText("Mysteriestation")).toBeDefined();
    });

    it("draws no trip for a correct guess", () => {
        overwriteGetLocale(() => "en");
        render(
            <GuessList
                guesses={[
                    ...guesses,
                    { guess: "ut2", correct: true, steps: [], totalMinutes: 0 },
                ]}
                stations={[
                    ...stations,
                    { code: "ut2", name: "Amersfoort Centraal" },
                ]}
            />,
        );

        const [found] = rows();
        expect(found?.textContent).toContain("You're here");
        expect(found?.querySelector(".sr-only")?.textContent).toBe(
            "Guess 5, Amersfoort Centraal: the mystery station.",
        );
    });

    it("plays the arrival on the entering guess's row only, with its timings", () => {
        overwriteGetLocale(() => "en");
        render(
            <GuessList guesses={guesses} stations={stations} enteringGuess="mt" />,
        );

        const [maastricht, ...older] = rows();
        expect(maastricht?.classList.contains("guess-enter")).toBe(true);
        for (const row of older) {
            expect(row.classList.contains("guess-enter")).toBe(false);
        }
        const track = maastricht?.querySelector<HTMLElement>("[style*='--trip-ms']");
        expect(track?.style.getPropertyValue("--trip-ms")).toBe("977ms");
        const ring = maastricht?.querySelector<HTMLElement>(".trip-ring");
        expect(ring?.style.getPropertyValue("--ring-delay")).toMatch(/^\d+ms$/);
    });

    it("heads a revealed list 'How you got there', with no grid and the found row on one line", () => {
        overwriteGetLocale(() => "en");
        const { container } = render(
            <GuessList
                guesses={[
                    ...guesses,
                    { guess: "amf", correct: true, steps: [], totalMinutes: 0 },
                ]}
                stations={[
                    ...stations,
                    { code: "amf", name: "Amersfoort Centraal" },
                ]}
                revealed
            />,
        );

        expect(
            screen.getByRole("heading", { level: 2, name: "How you got there" }),
        ).toBeDefined();
        expect(
            screen.getByText("Newest first. Every change is revealed now."),
        ).toBeDefined();
        expect(container.textContent).not.toContain("Mystery station");
        expect(container.textContent).not.toContain("30 min");
        const [found] = rows();
        expect(found?.textContent).toBe(
            "Guess 5, Amersfoort Centraal: the mystery station.5Amersfoort CentraalYou're here",
        );
        // No time grid behind the tracks.
        expect(
            document.querySelector("[style*='repeating-linear-gradient']"),
        ).toBeNull();
    });

    it("speaks Dutch in a revealed list", () => {
        render(<GuessList guesses={guesses} stations={stations} revealed />);

        expect(screen.getByRole("heading", { name: "Zo kwam je er" })).toBeDefined();
    });

    it("renders nothing before the first guess", () => {
        const { container } = render(<GuessList guesses={[]} stations={stations} />);

        expect(container.innerHTML).toBe("");
    });
});
