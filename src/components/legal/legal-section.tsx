import type { ReactNode } from "react";

type LegalSectionProps = {
    /** The heading's id, which names the section for a screen reader. */
    id: string;
    title: string;
    children: ReactNode;
};

/** One titled part of the About, Privacy or Terms page. */
export function LegalSection({ id, title, children }: LegalSectionProps) {
    return (
        <section aria-labelledby={id} className="flex flex-col gap-3">
            <h2
                id={id}
                className="font-condensed text-[30px] leading-[1.05] font-bold sm:text-[34px]"
            >
                {title}
            </h2>
            {children}
        </section>
    );
}
