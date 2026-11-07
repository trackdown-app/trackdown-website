// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    RouterProvider,
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
} from "@tanstack/react-router";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    deLocalizeUrl,
    localizeHref,
    localizeUrl,
    overwriteGetLocale,
} from "@/paraglide/runtime";
import { NetworkPicker } from "@/components/layout/network-picker";
import { networkCookieName, parseNetworkCookie } from "@/lib/network-choice";

/** The picker in the browser on `pathname`, inside a router as on the site. */
async function renderPicker(pathname: string) {
    const rootRoute = createRootRoute({ component: NetworkPicker });
    const pageRoute = createRoute({ getParentRoute: () => rootRoute, path: "$" });
    const router = createRouter({
        routeTree: rootRoute.addChildren([pageRoute]),
        history: createMemoryHistory({ initialEntries: [localizeHref(pathname)] }),
        rewrite: {
            input: ({ url }) => deLocalizeUrl(url),
            output: ({ url }) => localizeUrl(url),
        },
    });
    await router.load();
    await act(async () => {
        render(<RouterProvider router={router} />);
        await Promise.resolve();
    });
    return router;
}

beforeEach(() => {
    overwriteGetLocale(() => "en");
});

afterEach(() => {
    cleanup();
    document.cookie = `${networkCookieName}=; Path=/; Max-Age=0`;
});

describe("NetworkPicker", () => {
    it("opens from the pill with every network, the current one chosen", async () => {
        await renderPicker("/nl/archief");
        const user = userEvent.setup();
        const pill = screen.getByRole("button", {
            // The name starts with the network the pill shows (WCAG 2.5.3).
            name: /^Netherlands\s*\. Change network$/,
        });

        await user.click(pill);

        const dialog = await screen.findByRole("dialog", { name: "Networks" });
        const playable = within(dialog).getByRole("list", { name: "To play" });
        const link = within(playable).getByRole("link");
        expect(link.getAttribute("href")).toBe("/en/nl");
        expect(link.getAttribute("aria-current")).toBe("page");
        expect(link.textContent).toContain("Chosen");
        const upcoming = within(dialog).getByRole("region", { name: "Coming next" });
        expect(
            within(upcoming)
                .getAllByRole("listitem")
                .map((row) => row.textContent),
        ).toEqual([
            "BEBelgiumComing later",
            "DEGermanyComing later",
            "CHSwitzerlandComing later",
            "GBUnited KingdomComing later",
            "JPJapanComing later",
        ]);
        expect(within(upcoming).queryByRole("link")).toBeNull();
    });

    it("keeps the network chosen in the picker and closes", async () => {
        const router = await renderPicker("/hoe-te-spelen");
        const user = userEvent.setup();

        await user.click(screen.getByRole("button", { name: /Change network$/ }));
        await user.click(
            within(await screen.findByRole("dialog")).getByRole("link", {
                name: /Netherlands/,
            }),
        );

        expect(parseNetworkCookie(document.cookie)).toBe("nl");
        expect(router.state.location.pathname).toBe("/nl");
        expect(screen.queryByRole("dialog")).toBeNull();
    });
});
