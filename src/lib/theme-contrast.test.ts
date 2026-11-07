import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

/** The `--td-*` hex colours declared inside the given selector’s block. */
function readTokens(selector: string): Map<string, string> {
    const open = css.indexOf(selector);
    const close = css.indexOf("}", open);
    const block = css.slice(open, close);
    const tokens = new Map<string, string>();
    for (const match of block.matchAll(/--td-([a-z0-9-]+):\s*(#[0-9a-f]{6});/g)) {
        const [, name, value] = match;
        if (name != null && value != null) {
            tokens.set(name, value);
        }
    }
    return tokens;
}

const modes = {
    light: readTokens(":root {"),
    dark: readTokens(':root[data-theme="dark"] {'),
};

function luminance(hex: string): number {
    const channels = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    const [r = 0, g = 0, b = 0] = channels;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

/** Every text colour the design sets, with every ground it sets it on. */
const textPairs: [text: string, ground: string][] = [
    ...["ink", "muted", "line-1", "danger"].flatMap((text) =>
        ["bg", "surface", "soft"].map((ground): [string, string] => [text, ground]),
    ),
    ["on-line", "line-1"],
    ["on-line", "line-2"],
    ["on-line", "line-3"],
    ["on-action", "action"],
    ["bg", "ink"],
    ["on-plate", "plate"],
    ["plate-muted", "plate"],
];

describe.each(Object.entries(modes))("%s theme", (_mode, tokens) => {
    it("declares every token as a hex colour", () => {
        const names = new Set(textPairs.flat());
        for (const name of names) {
            expect(tokens.get(name), name).toMatch(/^#[0-9a-f]{6}$/);
        }
    });

    it.each(textPairs)("%s text on %s passes 4.5:1", (text, ground) => {
        const fg = tokens.get(text) ?? "";
        const bg = tokens.get(ground) ?? "";
        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
});

it("keeps the no-JavaScript dark palette identical", () => {
    expect(readTokens(":root:not([data-theme]) {")).toEqual(modes.dark);
});
