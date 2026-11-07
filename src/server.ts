import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { paraglideMiddleware } from "@/paraglide/server";
import { traceRequest } from "@/lib/logging/request-span";
import { createCspNonce, withSecurityHeaders } from "@/lib/security-headers";

/**
 * Whether this is a Vercel preview deployment, where Vercel injects its
 * toolbar and the policy allows its hosts (docs/errors-and-headers.md).
 */
const vercelToolbar = process.env["VERCEL_ENV"] === "preview";

export default createServerEntry({
    fetch(request, opts) {
        // A fresh nonce per response for the Content-Security-Policy. The
        // request context hands it to the router (`src/router.tsx`), which
        // puts it on the inline scripts it renders. The development server
        // goes without, because Vite's own inline scripts cannot carry it.
        const nonce = import.meta.env.DEV ? undefined : createCspNonce();

        // Resolves the request's locale from its URL and scopes it to this
        // request (AsyncLocalStorage) for the server render. The router's
        // rewrite (`src/router.tsx`) removes the locale prefix itself, so the
        // original request is passed straight through (docs/i18n.md).
        return traceRequest(request, async () => {
            const response = await paraglideMiddleware(request, () =>
                handler.fetch(request, {
                    ...opts,
                    context: {
                        ...opts?.context,
                        ...(nonce == null ? {} : { nonce }),
                    },
                }),
            );
            // Every answer gets the security headers, a page its policy
            // (docs/errors-and-headers.md).
            return withSecurityHeaders(response, nonce, { vercelToolbar });
        });
    },
});
