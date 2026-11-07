import { cn } from "@/lib/utils";

/**
 * The mark's colours: on the page, or on the answer plate, where the theme
 * is turned over and the mystery station's bar is filled, found.
 */
const tones = {
    page: {
        line1: "stroke-line-1",
        line2: "stroke-line-2",
        dot: "fill-ink",
        change: "fill-background stroke-ink",
        bar: "fill-background stroke-ink",
    },
    plate: {
        line1: "stroke-plate-line-1",
        line2: "stroke-plate-line-2",
        dot: "fill-on-plate",
        change: "fill-plate stroke-on-plate",
        bar: "fill-on-plate",
    },
};

type LogoMarkProps = {
    /** Where the mark sits: the page (the default) or the answer plate. */
    tone?: keyof typeof tones;
    className?: string;
};

/**
 * The logo's line mark from the design's Brand board: a guess (the filled
 * dot), the first train in line 1, a change, the second train in line 2 and
 * the mystery station's bar. Drawn in the theme's tokens, so it follows dark
 * mode. Decorative: the wordmark beside it names the link.
 */
export function LogoMark({ tone = "page", className }: LogoMarkProps) {
    const colours = tones[tone];
    return (
        <svg
            viewBox="0 0 96 48"
            fill="none"
            aria-hidden="true"
            className={cn("h-6 w-12 shrink-0", className)}
        >
            <path
                d="M10 24 H44"
                className={colours.line1}
                strokeWidth="8"
                strokeLinecap="round"
            />
            <path d="M52 24 H80" className={colours.line2} strokeWidth="8" />
            <circle cx="10" cy="24" r="8" className={colours.dot} />
            <circle
                cx="48"
                cy="24"
                r="8"
                className={colours.change}
                strokeWidth="4"
            />
            <rect
                x="76"
                y="6"
                width="16"
                height="36"
                rx="8"
                className={colours.bar}
                strokeWidth="4"
            />
        </svg>
    );
}
