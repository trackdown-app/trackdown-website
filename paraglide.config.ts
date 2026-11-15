import type { CompilerOptions } from "@inlang/paraglide-js";

/**
 * Paraglide compiler options shared by the Vite plugin (`bun run dev`,
 * `bun run build`) and `bun run paraglide:compile`, so both emit identical
 * output into `src/paraglide/`. Locales are declared in
 * `project.inlang/settings.json`; translations live in `messages/{locale}.json`.
 */
export const paraglideCompilerOptions: CompilerOptions = {
    project: "./project.inlang",
    outdir: "./src/paraglide",
    // The locale lives in the URL so every language has its own indexable
    // address: Dutch at `/`, English, German and French under `/en`, `/de`
    // and `/fr`. See docs/i18n.md.
    strategy: ["url", "baseLocale"],
    // Only `/en`, `/de` and `/fr` are locale prefixes. Paraglide's default
    // patterns treat a leading `/nl` as the Dutch prefix too and strip it,
    // which would take the Dutch network's pages at `/nl`
    // (docs/network-picker.md#routes). Listing the patterns makes Paraglide
    // match exactly these. A network id may never be one of these prefixes
    // (`src/lib/data/networks.test.ts`). The base locale's pattern comes last:
    // it matches every path.
    urlPatterns: [
        {
            pattern: ":protocol://:domain(.*)::port?/:path(.*)?",
            localized: [
                ["en", ":protocol://:domain(.*)::port?/en/:path(.*)?"],
                ["de", ":protocol://:domain(.*)::port?/de/:path(.*)?"],
                ["fr", ":protocol://:domain(.*)::port?/fr/:path(.*)?"],
                ["nl", ":protocol://:domain(.*)::port?/:path(.*)?"],
            ],
        },
    ],
    // The English home is `/en`, not `/en/`. A browser asking for a path with
    // a trailing slash is redirected to the one without.
    trailingSlash: "never",
    // Lets Vite tree-shake server-only runtime code out of the client bundle.
    isServer: "import.meta.env.SSR",
    // The output is JavaScript; `.d.ts` files keep it typed without `allowJs`.
    emitTsDeclarations: true,
};
