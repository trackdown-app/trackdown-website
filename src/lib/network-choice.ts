import { createIsomorphicFn } from "@tanstack/react-start";
import { networkIdSchema } from "@/lib/data/networks";
import type { NetworkId } from "@/lib/data/networks";

/**
 * The cookie that keeps the network a visitor plays, so `/` sends them back
 * to it on their next visit (docs/network-picker.md#keeping-the-choice). A
 * cookie rather than `localStorage`: the server reads it to answer `/` with
 * the right redirect. It holds a network id and nothing else.
 */
export const networkCookieName = "trackdown-network";

/** A year, in seconds; every pick in the picker renews it. */
const networkCookieMaxAge = 60 * 60 * 24 * 365;

/** The kept network in a `Cookie` header or `document.cookie`, if it is one the game has. */
export function parseNetworkCookie(cookies: string): NetworkId | undefined {
    for (const part of cookies.split(";")) {
        const [name, value] = part.trim().split("=");
        if (name === networkCookieName) {
            const parsed = networkIdSchema.safeParse(value);
            return parsed.success ? parsed.data : undefined;
        }
    }
    return undefined;
}

/**
 * The network this visitor chose last, read from the request's cookie in the
 * server render and from `document.cookie` in the browser. `undefined` when
 * they have not chosen one, or chose one the game no longer has.
 */
export const readNetworkChoice = createIsomorphicFn()
    .server(async (): Promise<NetworkId | undefined> => {
        // Imported here, so the browser's bundle never carries it.
        const { getRequestHeader } = await import("@tanstack/react-start/server");
        try {
            return parseNetworkCookie(getRequestHeader("cookie") ?? "");
        } catch {
            // Outside a Start request, as in the router's own tests.
            return undefined;
        }
    })
    .client(async (): Promise<NetworkId | undefined> =>
        Promise.resolve(parseNetworkCookie(document.cookie)),
    );

/** Keeps `network` as this visitor's choice for their next visits. */
export function keepNetworkChoice(network: NetworkId): void {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${networkCookieName}=${network}; Path=/; Max-Age=${String(networkCookieMaxAge)}; SameSite=Lax${secure}`;
}
