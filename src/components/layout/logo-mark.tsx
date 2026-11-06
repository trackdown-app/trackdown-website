import { cn } from "@/lib/utils";

type LogoMarkProps = {
    className?: string;
};

/**
 * The logo's line mark from the design's Brand board: a guess (the filled
 * dot), the first train in line 1, a change, the second train in line 2 and
 * the mystery station's bar. Drawn in the theme's tokens, so it follows dark
 * mode. Decorative: the wordmark beside it names the link.
 */
export function LogoMark({ className }: LogoMarkProps) {
    return (
        <svg
            viewBox="0 0 96 48"
            fill="none"
            aria-hidden="true"
            className={cn("h-6 w-12 shrink-0", className)}
        >
            <path
                d="M10 24 H44"
                className="stroke-line-1"
                strokeWidth="8"
                strokeLinecap="round"
            />
            <path d="M52 24 H80" className="stroke-line-2" strokeWidth="8" />
            <circle cx="10" cy="24" r="8" className="fill-ink" />
            <circle
                cx="48"
                cy="24"
                r="8"
                className="fill-background stroke-ink"
                strokeWidth="4"
            />
            <rect
                x="76"
                y="6"
                width="16"
                height="36"
                rx="8"
                className="fill-background stroke-ink"
                strokeWidth="4"
            />
        </svg>
    );
}
