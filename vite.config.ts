import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { paraglideCompilerOptions } from "./paraglide.config.ts";

const config = defineConfig(({ mode }) => {
    // The private game data (docs/deploy.md#the-game-data). The deploy
    // workflow sets both variables; locally `TRACKDOWN_DATA_DIR` comes from
    // `.env.local`. Without it the build carries no data.
    const env = loadEnv(mode, process.cwd(), "TRACKDOWN_");
    const dataDir = env["TRACKDOWN_DATA_DIR"];
    const dataRef = env["TRACKDOWN_DATA_REF"] ?? "local";

    return {
        resolve: {
            tsconfigPaths: true,
        },
        define: {
            // The trackdown-data commit this build was made from, for
            // `/api/v1/meta`. Only lands in a bundle whose code reads it.
            "import.meta.env.TRACKDOWN_DATA_REF": JSON.stringify(dataRef),
        },
        plugins: [
            // Compiles `messages/` into `src/paraglide/` (docs/i18n.md).
            paraglideVitePlugin(paraglideCompilerOptions),
            devtools(),
            tailwindcss(),
            tanstackStart(),
            // Bundles the Start server. No fixed preset: Nitro picks it from
            // the environment, so `vercel build` writes `.vercel/output/`
            // with the `vercel` preset and a local `bun run build` writes a
            // Node server into `.output/` for `bun run start`
            // (docs/deploy.md). Must directly follow `tanstackStart()`.
            nitro({
                plugins: ["src/config/telemetry.ts"],
                // Only read by the `vercel` preset: runs the server function
                // in Frankfurt, the region closest to the Netherlands.
                vercel: { functions: { regions: ["fra1"] } },
                // The data directory as the `assets:trackdown-data` storage
                // mount. In development Nitro reads it from disk; in a build
                // each file becomes a lazy import inside the server bundle,
                // never a static file. Nothing is bundled until server code
                // calls `useStorage()`.
                serverAssets:
                    dataDir != null && dataDir !== ""
                        ? [
                              {
                                  baseName: "trackdown-data",
                                  dir: resolve(dataDir),
                              },
                          ]
                        : [],
                // Nitro bundles React's libraries into the server, so
                // rolldown drops the `"use client"` directive at the top of
                // each module and warns about it. The directive means nothing
                // in a server bundle.
                rolldownConfig: { checks: { moduleLevelDirective: false } },
            }),
            viteReact(),
        ],
    };
});

export default config;
