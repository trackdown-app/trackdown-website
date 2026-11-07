import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { paraglideMiddleware } from "@/paraglide/server";
import { traceRequest } from "@/lib/logging/request-span";

export default createServerEntry({
    fetch(request, opts) {
        // Resolves the request's locale from its URL and scopes it to this
        // request (AsyncLocalStorage) for the server render. The router's
        // rewrite (`src/router.tsx`) removes the locale prefix itself, so the
        // original request is passed straight through (docs/i18n.md).
        return traceRequest(request, () =>
            paraglideMiddleware(request, () => handler.fetch(request, opts)),
        );
    },
});
