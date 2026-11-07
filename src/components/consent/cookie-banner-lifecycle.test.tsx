// @vitest-environment happy-dom
import {
    RouterProvider,
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
} from "@tanstack/react-router";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CookieBanner } from "@/components/consent/cookie-banner";
import type { ConsentChoice } from "@/lib/analytics/consent";

async function renderBanner(consent: ConsentChoice | null, path = "/") {
    const root = createRootRoute({
        component: () => <CookieBanner consent={consent} />,
    });
    const page = createRoute({ getParentRoute: () => root, path: "/" });
    const router = createRouter({
        routeTree: root.addChildren([page]),
        history: createMemoryHistory({ initialEntries: [path] }),
    });
    await router.load();
    vi.useFakeTimers();
    return render(<RouterProvider router={router} />);
}

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("cookie banner lifetime", () => {
    it.each([true, false])(
        "hides the saved analytics = %s confirmation after five seconds",
        async (analytics) => {
            const { container } = await renderBanner({ analytics });
            expect(screen.queryByRole("status")).not.toBeNull();

            act(() => {
                vi.advanceTimersByTime(4_999);
            });
            expect(screen.queryByRole("status")).not.toBeNull();

            act(() => {
                vi.advanceTimersByTime(1);
            });
            expect(screen.queryByRole("status")).toBeNull();
            expect(container.querySelector("aside")).toBeNull();
        },
    );

    it("keeps the unanswered banner visible", async () => {
        await renderBanner(null);
        act(() => {
            vi.advanceTimersByTime(60_000);
        });
        expect(screen.queryByRole("heading")).not.toBeNull();
        expect(screen.queryByRole("button", { name: "Accepteren" })).not.toBeNull();
    });

    it("keeps explicitly reopened settings visible", async () => {
        await renderBanner({ analytics: true }, "/?cookie-settings=open");
        act(() => {
            vi.advanceTimersByTime(60_000);
        });
        expect(screen.queryByRole("heading")).not.toBeNull();
        expect(screen.queryByRole("button", { name: "Weigeren" })).not.toBeNull();
    });
});
