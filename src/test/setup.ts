import { afterEach } from "vitest";
import { baseLocale, overwriteGetLocale } from "@/paraglide/runtime";

// A test that switches the locale (`overwriteGetLocale(() => "en")`) would
// carry it into the next test. Put the base locale back after every test.
afterEach(() => {
    overwriteGetLocale(() => baseLocale);
});
