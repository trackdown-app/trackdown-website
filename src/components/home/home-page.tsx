import { m } from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import { shellContainer } from "@/components/layout/shell-container";

/** Placeholder home page until the game lands. */
export function HomePage() {
    return (
        <main className={cn(shellContainer, "flex flex-col gap-4 pt-10 pb-16")}>
            <h1 className="font-condensed text-[clamp(44px,7vw,72px)] leading-[0.95] font-extrabold tracking-[-0.01em]">
                {m["site.name"]()}
            </h1>
            <p className="text-[19px] text-muted-foreground">
                {m["home.comingSoon"]()}
            </p>
        </main>
    );
}
