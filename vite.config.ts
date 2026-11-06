import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { paraglideCompilerOptions } from "./paraglide.config.ts";

const config = defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    plugins: [
        // Compiles `messages/` into `src/paraglide/` (docs/i18n.md).
        paraglideVitePlugin(paraglideCompilerOptions),
        devtools(),
        tailwindcss(),
        tanstackStart(),
        // Bundles the Start server into `.output/` with Nitro's default
        // preset, a Node server started with `bun run start`. Must directly
        // follow `tanstackStart()`.
        nitro({
            // Nitro bundles React's libraries into the server, so rolldown
            // drops the `"use client"` directive at the top of each module
            // and warns about it. The directive means nothing in a server
            // bundle.
            rolldownConfig: { checks: { moduleLevelDirective: false } },
        }),
        viteReact(),
    ],
});

export default config;
