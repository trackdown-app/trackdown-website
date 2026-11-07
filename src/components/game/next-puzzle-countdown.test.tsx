// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { NextPuzzleCountdown } from "@/components/game/next-puzzle-countdown";
import type { TodayPuzzleInput, TodayPuzzleOutput } from "@/lib/game/schemas";
import { todayPuzzleQueryOptions } from "@/lib/game/today-puzzle.queries";

const { getTodayPuzzleFn } = vi.hoisted(() => ({
    getTodayPuzzleFn:
        vi.fn<(options: { data: TodayPuzzleInput }) => Promise<TodayPuzzleOutput>>(),
}));
vi.mock("@/lib/game/today-puzzle.functions", () => ({ getTodayPuzzleFn }));

const today: TodayPuzzleOutput = {
    network: "nl",
    number: 142,
    date: "2026-11-06",
    maxGuesses: 6,
    nextPuzzleAt: "2026-11-06T23:00:00.000Z",
};
const tomorrow: TodayPuzzleOutput = {
    ...today,
    number: 143,
    date: "2026-11-07",
    nextPuzzleAt: "2026-11-07T23:00:00.000Z",
};

function queryClientWith(puzzle: TodayPuzzleOutput): QueryClient {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    // As the route's loader leaves it.
    queryClient.setQueryData(todayPuzzleQueryOptions("nl").queryKey, puzzle);
    return queryClient;
}

function countdown(queryClient: QueryClient) {
    return (
        <QueryClientProvider client={queryClient}>
            <NextPuzzleCountdown network="nl" />
        </QueryClientProvider>
    );
}

function clock(): HTMLElement {
    const time = document.querySelector("time");
    if (time == null) {
        throw new Error("no countdown on the page");
    }
    return time;
}

async function advance(ms: number) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
    });
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-06T22:59:55.000Z"));
    getTodayPuzzleFn.mockReset();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("NextPuzzleCountdown", () => {
    it("says how long until the next puzzle, in Dutch", () => {
        render(countdown(queryClientWith(today)));

        expect(screen.getByText(/Volgend station over/)).toBeTruthy();
        expect(clock().textContent).toBe("00:00:05");
        expect(clock().getAttribute("datetime")).toBe("PT0H0M5S");
    });

    it("says it in English", () => {
        overwriteGetLocale(() => "en");
        render(countdown(queryClientWith(today)));

        expect(screen.getByText(/Next station in/)).toBeTruthy();
    });

    it("ticks every second", async () => {
        render(countdown(queryClientWith(today)));

        await advance(1000);
        expect(clock().textContent).toBe("00:00:04");
        await advance(3000);
        expect(clock().textContent).toBe("00:00:01");
    });

    it("reads today's puzzle again at zero and counts down to the one after", async () => {
        getTodayPuzzleFn.mockResolvedValue(tomorrow);
        const queryClient = queryClientWith(today);
        render(countdown(queryClient));

        await advance(4000);
        expect(getTodayPuzzleFn).not.toHaveBeenCalled();
        await advance(1000);

        expect(getTodayPuzzleFn).toHaveBeenCalledTimes(1);
        expect(getTodayPuzzleFn).toHaveBeenCalledWith({ data: { network: "nl" } });
        expect(
            queryClient.getQueryData(todayPuzzleQueryOptions("nl").queryKey),
        ).toEqual(tomorrow);
        // Shown from the next tick at the latest.
        await advance(1000);
        expect(clock().textContent).toBe("23:59:59");

        // Counting down again, it does not ask once more.
        await advance(30_000);
        expect(getTodayPuzzleFn).toHaveBeenCalledTimes(1);
    });

    it("asks again while the server still answers today's puzzle", async () => {
        getTodayPuzzleFn
            .mockResolvedValueOnce(today)
            .mockResolvedValueOnce(today)
            .mockResolvedValue(tomorrow);
        render(countdown(queryClientWith(today)));

        await advance(5000);
        expect(getTodayPuzzleFn).toHaveBeenCalledTimes(1);
        expect(clock().textContent).toBe("00:00:00");

        await advance(10_000);
        expect(getTodayPuzzleFn).toHaveBeenCalledTimes(2);
        await advance(10_000);
        expect(getTodayPuzzleFn).toHaveBeenCalledTimes(3);
        expect(clock().textContent).toBe("23:59:40");
    });

    it("hydrates over the server's render without an error, then ticks on the browser's clock", async () => {
        const server = renderToString(countdown(queryClientWith(today)));
        expect(server).toContain(">00:00:05</time>");

        // The browser hydrates two seconds after the server rendered.
        vi.setSystemTime(new Date("2026-11-06T22:59:57.000Z"));
        const container = document.createElement("div");
        container.innerHTML = server;
        document.body.append(container);
        const onRecoverableError = vi.fn();
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const root = await act(() =>
            hydrateRoot(container, countdown(queryClientWith(today)), {
                onRecoverableError,
            }),
        );

        expect(onRecoverableError).not.toHaveBeenCalled();
        expect(consoleError).not.toHaveBeenCalled();
        await advance(1000);
        expect(clock().textContent).toBe("00:00:02");

        act(() => {
            root.unmount();
        });
        container.remove();
        consoleError.mockRestore();
    });
});
