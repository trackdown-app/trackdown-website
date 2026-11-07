import { m } from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import type { Statistics } from "@/lib/game/statistics";

type GuessDistributionProps = {
    statistics: Pick<Statistics, "distribution" | "missed" | "today">;
};

type Row = {
    key: string;
    label: string;
    count: number;
    spoken: string;
    isToday: boolean;
};

function rows({
    distribution,
    missed,
    today,
}: GuessDistributionProps["statistics"]): Row[] {
    const won = distribution.map((count, index): Row => {
        const guesses = index + 1;
        return {
            key: String(guesses),
            label: String(guesses),
            count,
            spoken:
                guesses === 1
                    ? m["statistics.rowOne"]({ count })
                    : m["statistics.rowMany"]({ guesses, count }),
            isToday: today === guesses,
        };
    });
    return [
        ...won,
        {
            key: "missed",
            label: m["statistics.missed"](),
            count: missed,
            spoken: m["statistics.rowMissed"]({ count: missed }),
            isToday: today === "missed",
        },
    ];
}

/**
 * The design's "Guesses needed" (docs/statistics.md#the-record): one bar per
 * number of guesses a game was won in, then the games missed, each as long
 * as its count against the longest. Today's game's bar is in line 1, the
 * others in `empty`. The bars are drawn for the eye; a screen reader hears
 * each row as a sentence, today's named.
 */
export function GuessDistribution({ statistics }: GuessDistributionProps) {
    const all = rows(statistics);
    const most = Math.max(1, ...all.map((row) => row.count));

    return (
        <div className="flex flex-col gap-2">
            <h3 className="mb-1 text-base font-semibold">
                {m["statistics.guessesNeeded"]()}
            </h3>
            <ul className="flex flex-col gap-2">
                {all.map((row) => (
                    <li key={row.key} className="flex items-center gap-3">
                        <span className="sr-only">
                            {row.isToday
                                ? m["statistics.rowToday"]({ row: row.spoken })
                                : row.spoken}
                        </span>
                        <span
                            aria-hidden="true"
                            className="w-13 shrink-0 text-[15px] text-muted-foreground"
                        >
                            {row.label}
                        </span>
                        <span
                            aria-hidden="true"
                            className="flex flex-1 items-center gap-2"
                        >
                            <span
                                data-today={row.isToday ? "" : undefined}
                                className={cn(
                                    "h-2.5 rounded-[5px]",
                                    row.isToday ? "bg-line-1" : "bg-empty",
                                )}
                                style={{
                                    width: `${Math.max(2, Math.round((row.count / most) * 80))}%`,
                                }}
                            />
                            <span className="text-[15px] font-semibold">
                                {row.count}
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
