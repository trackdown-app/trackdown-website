import { Link } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { GameLegend } from "@/components/game/game-legend";
import { shellContainer } from "@/components/layout/shell-container";
import { ExampleTrip } from "@/components/how-to-play/example-trip";

const sectionTitle =
    "font-condensed text-[30px] leading-none font-bold sm:text-[34px]";

/**
 * How to play (docs/how-to-play.md), the content of the design's iOS · How to
 * play board on a page of its own: the three rules, an example trip, the
 * line legend and the way to today's puzzle.
 */
export function HowToPlayPage() {
    return (
        <main className={cn(shellContainer, "flex flex-col pt-10 pb-16")}>
            <article className="flex max-w-[720px] flex-col gap-10">
                <h1 className="font-condensed text-[clamp(44px,7vw,72px)] leading-[0.95] font-extrabold tracking-[-0.01em]">
                    {m["howToPlay.title"]()}
                </h1>
                <ol className="flex flex-col gap-3.5">
                    <li className="flex items-baseline gap-3.5">
                        <span className="w-4 flex-none font-condensed text-2xl font-bold">
                            1
                        </span>
                        <span className="text-[19px] leading-[1.4]">
                            {m["howToPlay.rule1"]()}
                        </span>
                    </li>
                    <li className="flex items-baseline gap-3.5">
                        <span className="w-4 flex-none font-condensed text-2xl font-bold">
                            2
                        </span>
                        <span className="text-[19px] leading-[1.4]">
                            {m["howToPlay.rule2"]()}
                        </span>
                    </li>
                    <li className="flex items-baseline gap-3.5">
                        <span className="w-4 flex-none font-condensed text-2xl font-bold">
                            3
                        </span>
                        <span className="text-[19px] leading-[1.4]">
                            {m["howToPlay.rule3"]()}
                        </span>
                    </li>
                </ol>
                <section
                    aria-labelledby="how-to-play-example"
                    className="flex flex-col gap-4"
                >
                    <h2 id="how-to-play-example" className={sectionTitle}>
                        {m["howToPlay.exampleTitle"]()}
                    </h2>
                    <ExampleTrip />
                </section>
                <section
                    aria-labelledby="how-to-play-legend"
                    className="flex flex-col gap-4"
                >
                    <h2 id="how-to-play-legend" className={sectionTitle}>
                        {m["howToPlay.legendTitle"]()}
                    </h2>
                    <div className="text-base">
                        <GameLegend />
                    </div>
                </section>
                <div>
                    <Link to="/" className={buttonVariants({ size: "lg" })}>
                        {m["howToPlay.play"]()}
                    </Link>
                </div>
            </article>
        </main>
    );
}
