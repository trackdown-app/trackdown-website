import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { shellContainer } from "@/components/layout/shell-container";

type ErrorLayoutProps = {
    /** The status above the title, such as "Error 404". */
    label: string;
    title: string;
    lead: string;
    /** The way onward: links or buttons, the primary action first. */
    children: ReactNode;
};

/**
 * The page the not-found and error pages share. The design draws neither,
 * so it takes the playing board's title block: the date line becomes the
 * status, then the condensed title and the lead. It renders inside the root
 * route, so the header and footer frame it.
 */
export function ErrorLayout({ label, title, lead, children }: ErrorLayoutProps) {
    return (
        <main className={cn(shellContainer, "flex flex-col pt-10 pb-16")}>
            <p className="mb-3 text-base text-muted-foreground">{label}</p>
            <h1 className="max-w-[12em] font-condensed text-[clamp(44px,7vw,72px)] leading-[0.95] font-extrabold tracking-[-0.01em]">
                {title}
            </h1>
            <p className="mt-5 max-w-[36em] text-[19px] leading-normal text-muted-foreground">
                {lead}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">{children}</div>
        </main>
    );
}
