import { availableParallelism } from "node:os";
import { defineConfig, devices } from "@playwright/test";

const port = 3100;

/**
 * The browser checks in `e2e/*.spec.ts`: axe on every page in both languages
 * and themes, the solved game included, and a game played with the keyboard
 * alone (docs/accessibility.md). They run against the production build made
 * from the fixture, so run
 * `TRACKDOWN_DATA_DIR=fixtures/trackdown-data bun run build` first.
 */
const config = defineConfig({
    testDir: "e2e",
    testMatch: "*.spec.ts",
    fullyParallel: true,
    forbidOnly: process.env["CI"] != null,
    workers: Math.min(4, availableParallelism()),
    reporter: process.env["CI"] != null ? [["github"], ["list"]] : "list",
    use: {
        baseURL: `http://localhost:${port}`,
        contextOptions: { reducedMotion: "reduce" },
    },
    projects: [
        { name: "mobile", use: { ...devices["Pixel 7"] } },
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    ],
    webServer: {
        // The built server, its clock moved onto the fixture's puzzles
        // (e2e/clock.ts). No PostHog token: server telemetry stays on the
        // console.
        command:
            "node --import ./e2e/shift-server-clock.ts .output/server/index.mjs",
        url: `http://localhost:${port}/robots.txt`,
        env: { PORT: String(port), POSTHOG_PROJECT_TOKEN: "" },
        reuseExistingServer: process.env["CI"] == null,
        stdout: "ignore",
    },
});

export default config;
