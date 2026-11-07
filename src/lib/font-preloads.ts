import barlowCondensed700 from "@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2?url";
import barlowCondensed800 from "@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2?url";
import barlow400 from "@fontsource/barlow/files/barlow-latin-400-normal.woff2?url";
import barlow500 from "@fontsource/barlow/files/barlow-latin-500-normal.woff2?url";
import barlow600 from "@fontsource/barlow/files/barlow-latin-600-normal.woff2?url";
import barlow700 from "@fontsource/barlow/files/barlow-latin-700-normal.woff2?url";
import barlow800 from "@fontsource/barlow/files/barlow-latin-800-normal.woff2?url";

/**
 * The Latin files of every weight `src/styles.css` imports, which every page
 * draws in its first screen. Without a preload the browser only asks for
 * them once the stylesheet has arrived, and the text drawn in the fallback
 * moves when they swap in (docs/accessibility.md#fonts). Vite gives each the
 * same hashed URL as the stylesheet's `@font-face`, so it is fetched once.
 */
export const fontPreloadLinks = [
    barlow400,
    barlow500,
    barlow600,
    barlow700,
    barlow800,
    barlowCondensed700,
    barlowCondensed800,
].map(fontPreload);

/** A font is fetched without credentials, so its preload must be too. */
function fontPreload(href: string): {
    rel: string;
    href: string;
    as: string;
    type: string;
    crossOrigin: "anonymous";
} {
    return {
        rel: "preload",
        href,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
    };
}
