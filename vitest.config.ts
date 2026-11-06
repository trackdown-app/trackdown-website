import { defineConfig } from "vitest/config";

// Vitest prefers this file over `vite.config.ts`. The unit tests need only the
// `@/` alias: `tanstackStart()` and `nitro()` together make Vite evaluate the
// bundled server entry when the test server boots, which the tests never
// load (`src/router.test.tsx` renders through the router's own request
// handler instead), so neither plugin belongs here. Translations come from
// `paraglide:compile`, which `bun run test` runs first.
const config = defineConfig({
    resolve: { tsconfigPaths: true },
    test: {
        include: ["src/**/*.test.{ts,tsx}"],
        unstubEnvs: true,
        unstubGlobals: true,
        restoreMocks: true,
        // Puts the base locale back after every test.
        setupFiles: ["src/test/setup.ts"],
    },
});

export default config;
