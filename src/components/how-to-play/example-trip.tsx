import { m } from "@/paraglide/messages";
import { GuessList } from "@/components/game/guess-list";
import type { ListedGuess } from "@/lib/game/trip-line";

/**
 * The example from the design's iOS · How to play board: a guess of
 * Maastricht, 2h 25m from the mystery station, an IC for 2h 02m, a change
 * at an unknown station and a last ride of 17 minutes.
 */
const exampleGuess: ListedGuess = {
    guess: "mt",
    correct: false,
    steps: [
        { kind: "ride", train: "IC", minutes: 122 },
        { kind: "change", station: null, minutes: 6 },
        { kind: "ride", train: "SPR", minutes: 17 },
    ],
    totalMinutes: 145,
};

const exampleStations = [{ code: "mt", name: "Maastricht" }];

/**
 * One guess drawn as the game draws it, through the game's own guess list,
 * with a caption that reads the line. The list carries the trip in words for
 * a screen reader, as on the game page.
 */
export function ExampleTrip() {
    return (
        <figure className="flex flex-col gap-4 rounded-3xl bg-surface p-5 sm:p-6">
            <GuessList guesses={[exampleGuess]} stations={exampleStations} />
            <figcaption className="max-w-[36em] text-[15px] leading-[1.4] text-muted-foreground">
                {m["howToPlay.exampleCaption"]()}
            </figcaption>
        </figure>
    );
}
