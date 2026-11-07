import type { Ref } from "react";
import { m } from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/layout/logo-mark";

type AnswerPlateProps = {
    /** The line above the answer: how the game went. */
    outcome: string;
    /** The mystery station's name, once the reveal has answered. */
    station: string | null;
    /** The reveal did not answer: the plate says so and offers to ask again. */
    failed: boolean;
    onRetry: () => void;
    /** The page's heading, the station, for moving focus to it. */
    headingRef?: Ref<HTMLHeadingElement>;
};

/**
 * The answer plate from the design's Web · Solved board
 * (docs/game.md#the-answer-plate): the theme turned over, the logo mark with
 * its bar filled, how the game went, and the mystery station as the page's
 * heading. Until the reveal answers, a bar holds the station's place.
 */
export function AnswerPlate({
    outcome,
    station,
    failed,
    onRetry,
    headingRef,
}: AnswerPlateProps) {
    return (
        <div className="flex flex-col gap-2.5 rounded-xl bg-plate px-6 pt-7 pb-8 text-on-plate sm:px-9">
            <div className="flex flex-wrap items-center gap-3">
                <LogoMark tone="plate" className="h-5 w-10" />
                <span className="text-lg font-medium text-plate-muted">
                    {outcome}
                </span>
            </div>
            <h1
                ref={headingRef}
                tabIndex={-1}
                className="font-condensed text-[clamp(52px,9vw,112px)] leading-[0.9] font-extrabold tracking-[-0.01em] focus-visible:outline-plate-line-1"
            >
                {station ?? (
                    <>
                        <span className="sr-only">
                            {failed
                                ? m["gameOver.failed"]()
                                : m["gameOver.loading"]()}
                        </span>
                        <span
                            aria-hidden="true"
                            className={cn(
                                "block h-[0.9em] w-[6em] max-w-full rounded-lg bg-plate-muted/20",
                                !failed && "motion-safe:animate-pulse",
                            )}
                        />
                    </>
                )}
            </h1>
            {failed && (
                <div
                    role="alert"
                    className="mt-2 flex flex-wrap items-center gap-4 text-base"
                >
                    <span>{m["gameOver.failed"]()}</span>
                    <Button
                        variant="outline"
                        className="border-on-plate text-on-plate hover:bg-on-plate/10"
                        onClick={onRetry}
                    >
                        {m["gameOver.retry"]()}
                    </Button>
                </div>
            )}
        </div>
    );
}
