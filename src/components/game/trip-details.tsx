import { m } from "@/paraglide/messages";
import { lineBackgrounds } from "@/components/game/line-colours";
import { TripDetailsRail } from "@/components/game/trip-details-rail";
import { rideLine } from "@/lib/game/trip-line";
import type { ListedGuess } from "@/lib/game/trip-line";
import { formatMinutes, trainName } from "@/lib/game/trip-text";
import type { StationNames } from "@/lib/game/trip-text";

const rowClasses = "flex min-h-9 gap-3";
const timeClasses =
    "ml-auto flex-none self-center pl-3 text-[15px] tabular-nums text-muted-foreground";

/**
 * A guess's trip ride by ride (docs/guess-list.md#trip-details), drawn as a
 * line map turned on its side: the guessed station at the top, each train
 * in its line colour with its type spelled out and its time, each change
 * with its station and its wait, down to the mystery station. A change the
 * player has not found yet stays hidden. What the trip line has no room to
 * label, and the train codes a player may not know, read here in full.
 */
export function TripDetails({
    guess,
    names,
}: {
    guess: Pick<ListedGuess, "guess" | "steps">;
    names: StationNames;
}) {
    // The colour of each step's ride, in order: the three line colours in turn.
    const colours = guess.steps.map((step, index) =>
        step.kind === "ride"
            ? lineBackgrounds[
                  rideLine(
                      guess.steps
                          .slice(0, index)
                          .filter((before) => before.kind === "ride").length,
                  )
              ]
            : null,
    );
    const first = colours.find((colour) => colour != null) ?? null;
    const last = [...colours].reverse().find((colour) => colour != null) ?? null;

    return (
        <ol className="flex flex-col text-[15px] leading-tight">
            <li className={rowClasses}>
                <TripDetailsRail above={null} below={first}>
                    <span className="relative size-[18px] rounded-full bg-ink shadow-[0_0_0_3px_var(--td-surface)]" />
                </TripDetailsRail>
                <span className="self-center font-semibold">
                    {names.get(guess.guess) ?? guess.guess}
                </span>
            </li>
            {guess.steps.map((step, index) => {
                if (step.kind === "ride") {
                    const colour = colours[index] ?? null;
                    return (
                        // The steps never reorder, so their place is their key.
                        <li key={index} className={`${rowClasses} min-h-11`}>
                            <TripDetailsRail above={colour} below={colour} />
                            <span className="flex items-center gap-2 self-center">
                                <span
                                    className={`rounded-[5px] px-1.5 py-0.5 text-[13px] font-bold text-on-line ${colour ?? ""}`}
                                >
                                    {step.train}
                                </span>
                                {trainName(step.train)}
                            </span>
                            <span className={timeClasses}>
                                {formatMinutes(step.minutes)}
                            </span>
                        </li>
                    );
                }
                const known = step.station != null;
                return (
                    <li key={index} className={rowClasses}>
                        <TripDetailsRail
                            above={colours[index - 1] ?? null}
                            below={colours[index + 1] ?? null}
                        >
                            <span className="relative flex size-[18px] items-center justify-center rounded-full border-[3px] border-ink bg-surface text-[10px] leading-none font-extrabold text-ink">
                                {known ? null : "?"}
                            </span>
                        </TripDetailsRail>
                        <span
                            className={
                                known
                                    ? "self-center font-semibold"
                                    : "self-center text-muted-foreground"
                            }
                        >
                            {step.station == null
                                ? m["tripDetails.unknownStation"]()
                                : (names.get(step.station) ?? step.station)}
                        </span>
                        <span className={timeClasses}>
                            {m["tripDetails.wait"]({
                                duration: formatMinutes(step.minutes),
                            })}
                        </span>
                    </li>
                );
            })}
            <li className={rowClasses}>
                <TripDetailsRail above={last} below={null}>
                    <span className="relative flex size-[18px] items-center justify-center rounded-full bg-ink text-[11px] leading-none font-extrabold text-background">
                        ?
                    </span>
                </TripDetailsRail>
                <span className="self-center font-semibold">
                    {m["tripDetails.mysteryStation"]()}
                </span>
            </li>
        </ol>
    );
}
