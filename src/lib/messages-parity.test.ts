import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { baseLocale, locales } from "@/paraglide/runtime";
import type { Locale } from "@/paraglide/runtime";

/**
 * Paraglide types every message function from the base locale and silently
 * falls back to it when another locale lacks a message. This guards the gap:
 * every locale file must declare exactly the same message paths.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Flattens nested message objects to the dotted ids Paraglide compiles, e.g. `game.title`. */
function collectMessagePaths(node: Record<string, unknown>, prefix = ""): string[] {
    return Object.entries(node).flatMap(([key, value]) => {
        const path = prefix === "" ? key : `${prefix}.${key}`;
        return isRecord(value) ? collectMessagePaths(value, path) : [path];
    });
}

function readMessagePaths(locale: Locale): readonly string[] {
    const filePath = fileURLToPath(
        new URL(`../../messages/${locale}.json`, import.meta.url),
    );
    const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    if (!isRecord(parsed)) {
        throw new Error(`messages/${locale}.json must contain an object`);
    }
    return collectMessagePaths(parsed)
        .filter((path) => path !== "$schema")
        .sort();
}

describe("message files", () => {
    const basePaths = readMessagePaths(baseLocale);

    it("declare at least one message in the base locale", () => {
        expect(basePaths.length).toBeGreaterThan(0);
    });

    it.each(locales.filter((locale) => locale !== baseLocale))(
        "declare the same message paths in %s as in the base locale",
        (locale) => {
            expect(readMessagePaths(locale)).toEqual(basePaths);
        },
    );
});
