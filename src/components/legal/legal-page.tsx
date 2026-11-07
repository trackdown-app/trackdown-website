import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { shellContainer } from "@/components/layout/shell-container";

type LegalPageProps = {
    /** The "Last updated" line above the title, if the page has one. */
    updated?: string;
    title: string;
    intro: string;
    children: ReactNode;
};

/**
 * The layout of the About, Privacy and Terms pages, after the design's Web ·
 * Privacy policy and Web · Terms of use boards: a 720px article with the
 * date, the condensed title and a muted introduction, then its sections.
 */
export function LegalPage({ updated, title, intro, children }: LegalPageProps) {
    return (
        <main className={cn(shellContainer, "pt-10 pb-16")}>
            <article className="flex max-w-[720px] flex-col gap-10 text-lg leading-[1.6]">
                <div className="flex flex-col gap-4">
                    {updated != null && (
                        <p className="text-base text-muted-foreground">{updated}</p>
                    )}
                    <h1 className="font-condensed text-[clamp(44px,7vw,72px)] leading-[0.95] font-extrabold tracking-[-0.01em]">
                        {title}
                    </h1>
                    <p className="text-xl leading-normal text-muted-foreground">
                        {intro}
                    </p>
                </div>
                {children}
            </article>
        </main>
    );
}
