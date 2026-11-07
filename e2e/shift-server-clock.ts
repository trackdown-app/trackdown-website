import { clockShiftMs } from "./clock.ts";

// Loaded with `node --import` before the built server (playwright.config.ts,
// lighthouserc.yml), never in the site itself: every `new Date()` and
// `Date.now()` on the server reads the shifted time, so today's puzzle is one
// of the fixture's (e2e/clock.ts). A date built from a value is left alone.

const RealDate = globalThis.Date;
const shift = clockShiftMs(RealDate.now());

function shiftedNow(): number {
    return RealDate.now() + shift;
}

globalThis.Date = new Proxy(RealDate, {
    construct(target, args, newTarget) {
        return Reflect.construct(
            target,
            args.length === 0 ? [shiftedNow()] : args,
            newTarget,
        );
    },
    // `Date()` called without `new` answers the current time as text.
    apply(target) {
        return new target(shiftedNow()).toString();
    },
    get(target, property, receiver) {
        if (property === "now") {
            return shiftedNow;
        }
        return Reflect.get(target, property, receiver);
    },
});
