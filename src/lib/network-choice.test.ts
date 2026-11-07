// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import {
    keepNetworkChoice,
    networkCookieName,
    parseNetworkCookie,
} from "@/lib/network-choice";

afterEach(() => {
    document.cookie = `${networkCookieName}=; Path=/; Max-Age=0`;
});

describe("parseNetworkCookie", () => {
    it("reads the kept network among other cookies", () => {
        expect(parseNetworkCookie(`theme=dark; ${networkCookieName}=nl; x=1`)).toBe(
            "nl",
        );
    });

    it("has no choice without the cookie", () => {
        expect(parseNetworkCookie("")).toBeUndefined();
        expect(parseNetworkCookie("theme=dark")).toBeUndefined();
    });

    it("ignores a network the game does not have", () => {
        expect(parseNetworkCookie(`${networkCookieName}=be`)).toBeUndefined();
        expect(parseNetworkCookie(`${networkCookieName}=`)).toBeUndefined();
    });
});

describe("keepNetworkChoice", () => {
    it("keeps the network in the cookie the server reads", () => {
        keepNetworkChoice("nl");

        expect(parseNetworkCookie(document.cookie)).toBe("nl");
    });
});
