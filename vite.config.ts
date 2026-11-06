import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const config = defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    plugins: [
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
