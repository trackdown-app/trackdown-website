import { m } from "@/paraglide/messages";
import { GuessDistribution } from "@/components/game/guess-distribution";
import type { Statistics } from "@/lib/game/statistics";

type StatisticsSummaryProps = {
    statistics: Statistics;
};

/**
 * The record's figures, after the design's "Your Netherlands record"
 * (docs/statistics.md#the-record): played, won, streak and best streak in a
 * row of four (two rows of two at phone width, where four 48px figures do
 * not fit), then the guesses needed.
 */
export function StatisticsSummary({ statistics }: StatisticsSummaryProps) {
    const figures = [
        {
            key: "played",
            label: m["statistics.played"](),
            value: String(statistics.played),
        },
        {
            key: "won",
            label: m["statistics.won"](),
            value: m["statistics.winPercent"]({ percent: statistics.winPercent }),
        },
        {
            key: "streak",
            label: m["statistics.streak"](),
            value: String(statistics.currentStreak),
        },
        {
            key: "bestStreak",
            label: m["statistics.bestStreak"](),
            value: String(statistics.bestStreak),
        },
    ];

    return (
        <div className="flex flex-col gap-7">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {figures.map((figure) => (
                    // A `div` around each pair is valid in a `dl`.
                    <div key={figure.key} className="flex min-w-0 flex-col">
                        <dt className="text-[15px] text-muted-foreground">
                            {figure.label}
                        </dt>
                        <dd className="font-condensed text-5xl leading-none font-bold">
                            {figure.value}
                        </dd>
                    </div>
                ))}
            </dl>
            <GuessDistribution statistics={statistics} />
        </div>
    );
}
