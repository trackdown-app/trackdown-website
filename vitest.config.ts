import { defineConfig } from "vitest/config";

// Vitest prefers this file over `vite.config.ts`. The unit tests need only the
// `@/` alias: `tanstackStart()` and `nitro()` together make Vite evaluate the
// bundled server entry when the test server boots, which the tests never
// load, so neither plugin belongs here.
const config = defineConfig({
    resolve: { tsconfigPaths: true },
    test: {
        include: ["src/**/*.test.{ts,tsx}"],
        unstubEnvs: true,
        unstubGlobals: true,
        restoreMocks: true,
    },
});

export default config;
