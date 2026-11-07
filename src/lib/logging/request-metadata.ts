import { z } from "zod";
import { AsyncLocalStorage } from "node:async_hooks";
import { operationAttributes, routeSchema } from "@/lib/logging/attributes";
import type { TelemetryAttributes } from "@/lib/logging/attributes";

/** Safe metadata learned by REST handlers and SSR loaders in this request only. */
export const requestLogContext = new AsyncLocalStorage<TelemetryAttributes>();

export function annotateRequest(attributes: TelemetryAttributes): void {
    const current = requestLogContext.getStore();
    if (current != null) Object.assign(current, attributes);
}

/** Match only known routes; never keep the original URL or query string. */
export function requestAttributes(request: Request): TelemetryAttributes {
    const path = new URL(request.url).pathname.replace(/^\/en(?=\/|$)/, "") || "/";
    const api =
        /^\/api\/v1\/([^/]+)\/(stations|puzzles)(?:\/(today|[1-9][0-9]*))?(?:\/(guesses|reveal))?$/.exec(
            path,
        );
    let route = path;
    if (api != null) {
        const tail = api[3];
        route = `/api/v1/{network}/${api[2]}${tail == null ? "" : tail === "today" ? "/today" : "/{number}"}${api[4] == null ? "" : `/${api[4]}`}`;
    } else if (/^\/archief\/[1-9][0-9]*$/.test(path)) {
        route = "/archief/{number}";
    } else if (path.startsWith("/_serverFn/")) {
        route = "/_serverFn/{id}";
    }
    const known = routeSchema.safeParse(route);
    const method = z
        .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
        .safeParse(request.method);
    return {
        "http.request.method": method.success ? method.data : "OTHER",
        "http.route": known.success ? known.data : "unknown",
        "request.kind": path.startsWith("/api/v1")
            ? "api"
            : route === "/_serverFn/{id}"
              ? "server-function"
              : known.success
                ? "page"
                : "unknown",
        ...operationAttributes({ network: api?.[1], number: api?.[3] }),
    };
}
