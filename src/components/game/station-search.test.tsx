// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { StationSearch } from "@/components/game/station-search";
import type { StationOption } from "@/lib/game/station-search";

const stations: StationOption[] = [
    { code: "ass", name: "Amstel", province: "Noord-Holland" },
    { code: "asd", name: "Amsterdam Centraal", province: "Noord-Holland" },
    { code: "ass2", name: "Amsterdam Sloterdijk", province: "Noord-Holland" },
    { code: "asdz", name: "Amsterdam Zuid", province: "Noord-Holland" },
    { code: "ht", name: "'s-Hertogenbosch", province: "Noord-Brabant" },
    { code: "ut", name: "Utrecht Centraal", province: "Utrecht" },
];

afterEach(() => {
    cleanup();
});

function renderSearch(guessed: string[] = []) {
    const onGuess = vi.fn<(station: StationOption) => void>();
    render(
        <StationSearch
            stations={stations}
            guessed={guessed}
            guessNumber={5}
            maxGuesses={6}
            onGuess={onGuess}
        />,
    );
    return { onGuess, user: userEvent.setup() };
}

function optionNames(): string[] {
    return screen
        .queryAllByRole("option")
        .map((option) => option.getAttribute("aria-label") ?? "");
}

describe("StationSearch", () => {
    it("is a labelled combobox whose placeholder counts the guess", () => {
        overwriteGetLocale(() => "en");
        renderSearch();

        const input = screen.getByRole("combobox", { name: "Guess a station" });
        expect(input.getAttribute("placeholder")).toBe("Guess station 5 of 6");
    });

    it("counts the guess in Dutch by default", () => {
        renderSearch();

        expect(screen.getByRole("combobox").getAttribute("placeholder")).toBe(
            "Raad station 5 van 6",
        );
    });

    it("offers nothing before the player types", async () => {
        const { user } = renderSearch();

        await user.click(screen.getByRole("combobox"));

        expect(screen.queryByRole("listbox")).toBeNull();
    });

    it('offers the Amsterdam stations for "ams", province beside each', async () => {
        const { user } = renderSearch();

        await user.type(screen.getByRole("combobox"), "ams");

        expect(screen.getByRole("listbox")).toBeDefined();
        expect(optionNames()).toEqual([
            "Amstel, Noord-Holland",
            "Amsterdam Centraal, Noord-Holland",
            "Amsterdam Sloterdijk, Noord-Holland",
            "Amsterdam Zuid, Noord-Holland",
        ]);
        const centraal = screen.getByRole("option", {
            name: "Amsterdam Centraal, Noord-Holland",
        });
        expect(centraal.querySelector("strong")?.textContent).toBe("Ams");
        expect(centraal.textContent).toContain("Noord-Holland");
    });

    it("does not offer a station already guessed", async () => {
        const { user } = renderSearch(["asd"]);

        await user.type(screen.getByRole("combobox"), "ams");

        expect(optionNames()).not.toContain("Amsterdam Centraal, Noord-Holland");
    });

    it("picks with the arrow keys and Enter, then guesses with Enter", async () => {
        const { user, onGuess } = renderSearch();
        const input = screen.getByRole("combobox");

        await user.type(input, "ams");
        await user.keyboard("{ArrowDown}{Enter}");

        expect(input).toHaveProperty("value", "Amsterdam Centraal");
        expect(screen.queryByRole("listbox")).toBeNull();
        expect(onGuess).not.toHaveBeenCalled();

        await user.keyboard("{Enter}");

        expect(onGuess).toHaveBeenCalledWith(stations[1]);
        expect(input).toHaveProperty("value", "");
    });

    it("closes the list with Escape and keeps the text", async () => {
        const { user } = renderSearch();
        const input = screen.getByRole("combobox");

        await user.type(input, "ams");
        await user.keyboard("{Escape}");

        expect(screen.queryByRole("listbox")).toBeNull();
        expect(input).toHaveProperty("value", "ams");
    });

    it("guesses a name typed out in full with the Guess button", async () => {
        overwriteGetLocale(() => "en");
        const { user, onGuess } = renderSearch();

        await user.type(screen.getByRole("combobox"), "s hertogenbosch");
        // The open list hides the rest of the page from the accessibility
        // tree (`aria-hidden`, so no role query finds the button by name);
        // a pointer click on it still lands.
        await user.click(screen.getByText("Guess", { selector: "button" }));

        expect(onGuess).toHaveBeenCalledWith(stations[4]);
    });

    it("does not guess part of a name", async () => {
        overwriteGetLocale(() => "en");
        const { user, onGuess } = renderSearch();

        await user.type(screen.getByRole("combobox"), "amsterdam");
        await user.keyboard("{Escape}");
        await user.click(screen.getByRole("button", { name: "Guess" }));

        expect(onGuess).not.toHaveBeenCalled();
    });

    it("says so when nothing matches", async () => {
        overwriteGetLocale(() => "en");
        const { user } = renderSearch();

        await user.type(screen.getByRole("combobox"), "xyz");

        expect(screen.getByText("No station matches “xyz”")).toBeDefined();
    });
});
