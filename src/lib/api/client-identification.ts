// Marks this module server-only: it reads the server's environment.
import "@tanstack/react-start/server-only";
import { ApiError } from "@/lib/api/api-error";
import {
    appVersionHeader,
    appVersionPattern,
    clientKeyHeader,
} from "@/lib/api/client-headers";
import { clientIp } from "@/lib/api/request-guard";

// Who calls the REST API (docs/api.md#client-identification): every call
// under `/api/v1` but the OpenAPI document names its client key and app
// version, so iOS traffic is told apart and a key can be cut off without
// accounts. The web's server functions do not go through here.

/**
 * The client keys the server accepts: `TRACKDOWN_CLIENT_KEYS`, read on every
 * call, comma-separated, so a rotation keeps the old key beside the new one.
 * Unset or empty, no key is accepted.
 */
export function acceptedClientKeys(): ReadonlySet<string> {
    const keys = process.env["TRACKDOWN_CLIENT_KEYS"] ?? "";
    return new Set(
        keys
            .split(",")
            .map((key) => key.trim())
            .filter((key) => key !== ""),
    );
}

let warnedNoKeys = false;

/**
 * `unknown_client` for a call that does not name an accepted client key and
 * a valid app version, else `null`. A refusal is logged as API abuse.
 */
export function unknownClientError(request: Request): ApiError | null {
    const key = request.headers.get(clientKeyHeader)?.trim() ?? "";
    const version = request.headers.get(appVersionHeader)?.trim() ?? "";
    const keys = acceptedClientKeys();

    let reason: string | null = null;
    if (key === "") {
        reason = `no ${clientKeyHeader} header`;
    } else if (!keys.has(key)) {
        reason = `an unknown ${clientKeyHeader}`;
    } else if (!appVersionPattern.test(version)) {
        reason =
            version === ""
                ? `no ${appVersionHeader} header`
                : `an ${appVersionHeader} that is not major.minor[.patch]`;
    }
    if (reason == null) {
        return null;
    }

    if (keys.size === 0 && !warnedNoKeys) {
        warnedNoKeys = true;
        console.error(
            "TRACKDOWN_CLIENT_KEYS is not set: every REST call is refused as unknown_client",
        );
    }
    const path = new URL(request.url).pathname;
    console.warn("API abuse: a call from an unknown client was refused", {
        reason,
        appVersion: version === "" ? null : version,
        path,
        ip: clientIp(request),
    });
    return new ApiError("unknown_client", `${path} was called with ${reason}`);
}
