// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { StatisticsDialog } from "@/components/layout/statistics-dialog";
import { gameStorageKey, serializeGame } from "@/lib/game/game-state";
import type { PuzzleArchiveInput, PuzzleArchiveOutput } from "@/lib/game/schemas";

const { getPuzzleArchiveFn } = vi.hoisted(() => ({
    getPuzzleArchiveFn:
        vi.fn<
            (options: { data: PuzzleArchiveInput }) => Promise<PuzzleArchiveOutput>
        >(),
}));
vi.mock("@/lib/game/puzzle-archive.functions", () => ({ getPuzzleArchiveFn }));

function renderDialog() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <StatisticsDialog />
        </QueryClientProvider>,
    );
    return userEvent.setup();
}

beforeEach(() => {
    window.localStorage.clear();
    getPuzzleArchiveFn.mockReset();
    getPuzzleArchiveFn.mockResolvedValue({
        network: "nl",
        puzzles: [
            { number: 141, date: "2026-11-05" },
            { number: 142, date: "2026-11-06" },
        ],
    });
    overwriteGetLocale(() => "en");
});

afterEach(() => {
    cleanup();
});

describe("StatisticsDialog", () => {
    it("asks for nothing until it is opened", () => {
        renderDialog();

        expect(screen.getByRole("button", { name: "Statistics" })).toBeDefined();
        expect(getPuzzleArchiveFn).not.toHaveBeenCalled();
    });

    it("opens the record at the Netherlands and closes again", async () => {
        window.localStorage.setItem(
            gameStorageKey("nl", 141),
            serializeGame([
                { guess: "ut", correct: true, steps: [], totalMinutes: 0 },
            ]),
        );
        const user = renderDialog();

        await user.click(screen.getByRole("button", { name: "Statistics" }));

        const dialog = await screen.findByRole("dialog", {
            name: "Your Netherlands record",
        });
        expect(await within(dialog).findByText("Played")).toBeDefined();
        expect(getPuzzleArchiveFn).toHaveBeenCalledWith({ data: { network: "nl" } });
        // Yesterday's win still counts while today's puzzle is to play.
        const streak = within(dialog).getByText("Streak").nextElementSibling;
        expect(streak?.textContent).toBe("1");

        await user.click(within(dialog).getByRole("button", { name: "Close" }));

        await waitFor(() => {
            expect(screen.queryByRole("dialog")).toBeNull();
        });
    });

    it("names it in Dutch", async () => {
        overwriteGetLocale(() => "nl");
        const user = renderDialog();

        await user.click(screen.getByRole("button", { name: "Statistieken" }));

        expect(
            await screen.findByRole("dialog", { name: "Jouw record in Nederland" }),
        ).toBeDefined();
    });
});
