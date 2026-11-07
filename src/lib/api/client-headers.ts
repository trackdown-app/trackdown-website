// The headers a REST client names itself with (docs/api.md#client-identification).
// Holds no server code, so the OpenAPI document can name them too.

/** The header with the app's client key, one of `TRACKDOWN_CLIENT_KEYS`. */
export const clientKeyHeader = "Trackdown-Client-Key";

/** The header with the app's version, `major.minor` or `major.minor.patch`. */
export const appVersionHeader = "Trackdown-App-Version";

/** What `appVersionHeader` must match. */
export const appVersionPattern = /^\d{1,4}\.\d{1,4}(\.\d{1,4})?$/;
