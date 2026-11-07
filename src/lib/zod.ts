// eslint-disable-next-line no-restricted-imports -- the one module that imports zod itself
import { z } from "zod";

// Zod, set up for the site's Content-Security-Policy. The first object
// schema built on a page makes Zod probe whether it may compile a faster
// parser with `new Function`. The policy has no 'unsafe-eval', so in the
// browser the probe fails and is logged as a CSP violation
// (docs/errors-and-headers.md). Jitless mode skips the probe. Every module
// imports `z` from here, so this runs before any schema is built: an early
// import elsewhere would not do, because the bundler runs shared chunks
// before the entry's own code.
z.config({ jitless: true });

export { z };
