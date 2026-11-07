// @vitest-environment happy-dom
import { runInNewContext } from "node:vm";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { themeInitScript, themeStorageKey } from "@/lib/theme";
import { overwriteGetLocale } from "@/paraglide/runtime";

let systemDark = false;
let mediaEvents = new EventTarget();

/** Execute the exact script sent in the head, before rendering React. */
function boot(storage: Pick<Storage, "getItem"> = window.localStorage) {
    runInNewContext(themeInitScript, {
        document,
        localStorage: storage,
        matchMedia: window.matchMedia.bind(window),
    });
}

function changeSystem(dark: boolean) {
    act(() => {
        systemDark = dark;
        mediaEvents.dispatchEvent(new Event("change"));
    });
}

beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset["theme"];
    delete document.documentElement.dataset["themePreference"];
    systemDark = false;
    mediaEvents = new EventTarget();
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
        get matches() {
            return systemDark;
        },
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: mediaEvents.addEventListener.bind(mediaEvents),
        removeEventListener: mediaEvents.removeEventListener.bind(mediaEvents),
        dispatchEvent: mediaEvents.dispatchEvent.bind(mediaEvents),
    }));
    overwriteGetLocale(() => "en");
});

afterEach(() => {
    cleanup();
    delete document.documentElement.dataset["theme"];
    delete document.documentElement.dataset["themePreference"];
});

describe("theme before paint", () => {
    it.each([false, true])(
        "follows system dark = %s without a saved choice",
        (dark) => {
            systemDark = dark;
            boot();

            expect(document.documentElement.dataset["theme"]).toBe(
                dark ? "dark" : "light",
            );
            expect(window.localStorage.getItem(themeStorageKey)).toBeNull();
        },
    );

    it.each(["light", "dark"])(
        "applies saved %s over the opposite system theme",
        (theme) => {
            systemDark = theme === "light";
            window.localStorage.setItem(themeStorageKey, theme);
            boot();

            expect(document.documentElement.dataset["theme"]).toBe(theme);
        },
    );

    it("ignores invalid stored values", () => {
        systemDark = true;
        window.localStorage.setItem(themeStorageKey, "invalid");
        boot();

        expect(document.documentElement.dataset["theme"]).toBe("dark");
        expect(document.documentElement.dataset["themePreference"]).toBe("system");
    });

    it("uses the system when storage cannot be read", () => {
        systemDark = true;
        boot({
            getItem: () => {
                throw new Error("storage blocked");
            },
        });

        expect(document.documentElement.dataset["theme"]).toBe("dark");
    });
});

describe("ThemeToggle", () => {
    it("hydrates a dark first paint without a mismatch", async () => {
        const container = document.createElement("div");
        container.innerHTML = renderToString(<ThemeToggle />);
        document.body.append(container);
        systemDark = true;
        boot();
        const onRecoverableError = vi.fn();
        const onError = vi.spyOn(console, "error");
        const root = await act(() =>
            hydrateRoot(container, <ThemeToggle />, { onRecoverableError }),
        );
        try {
            expect(document.documentElement.dataset["theme"]).toBe("dark");
            expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe(
                "true",
            );
            expect(onRecoverableError).not.toHaveBeenCalled();
            expect(onError).not.toHaveBeenCalled();
        } finally {
            act(() => root.unmount());
            container.remove();
        }
    });

    it("follows live system changes until a keyboard toggle overrides them", async () => {
        boot();
        const user = userEvent.setup();
        render(<ThemeToggle />);
        const button = screen.getByRole("button", { name: "Dark mode" });
        expect(button.getAttribute("aria-pressed")).toBe("false");

        changeSystem(true);
        expect(button.getAttribute("aria-pressed")).toBe("true");

        await user.tab();
        expect(document.activeElement).toBe(button);
        await user.keyboard(" ");
        expect(button.getAttribute("aria-pressed")).toBe("false");
        expect(window.localStorage.getItem(themeStorageKey)).toBe("light");

        changeSystem(false);
        changeSystem(true);
        expect(document.documentElement.dataset["theme"]).toBe("light");

        cleanup();
        boot();
        render(<ThemeToggle />);
        expect(document.documentElement.dataset["theme"]).toBe("light");
        expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe(
            "false",
        );
    });

    it("can persist a dark override and toggle it back to light", async () => {
        boot();
        const user = userEvent.setup();
        render(<ThemeToggle />);

        await user.click(screen.getByRole("button"));
        expect(document.documentElement.dataset["theme"]).toBe("dark");
        expect(window.localStorage.getItem(themeStorageKey)).toBe("dark");
        await user.click(screen.getByRole("button"));
        expect(document.documentElement.dataset["theme"]).toBe("light");
    });

    it("keeps an override for this visit when writing storage fails", async () => {
        boot();
        vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
            throw new Error("storage blocked");
        });
        const user = userEvent.setup();
        render(<ThemeToggle />);

        await user.click(screen.getByRole("button"));
        changeSystem(true);
        changeSystem(false);
        expect(document.documentElement.dataset["theme"]).toBe("dark");
        expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
    });

    it("syncs another tab's override and returns to system if storage is cleared", () => {
        boot();
        render(<ThemeToggle />);
        act(() => {
            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: themeStorageKey,
                    newValue: "dark",
                }),
            );
        });
        expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");

        act(() => {
            window.dispatchEvent(new StorageEvent("storage", { key: null }));
        });
        expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe(
            "false",
        );
        changeSystem(true);
        expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
    });

    it("names the toggle in Dutch", () => {
        overwriteGetLocale(() => "nl");
        boot();
        render(<ThemeToggle />);

        expect(screen.getByRole("button", { name: "Donkere modus" })).toBeDefined();
    });
});
