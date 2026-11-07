import { useId, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { SearchIcon } from "lucide-react";
import { m } from "@/paraglide/messages";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ComboboxContent } from "@/components/ui/combobox-content";
import { ComboboxEmpty } from "@/components/ui/combobox-empty";
import { ComboboxInput } from "@/components/ui/combobox-input";
import { ComboboxItem } from "@/components/ui/combobox-item";
import { ComboboxList } from "@/components/ui/combobox-list";
import { StationMatchName } from "@/components/game/station-match-name";
import {
    findStationByName,
    foldForSearch,
    searchStations,
} from "@/lib/game/station-search";
import type { StationOption } from "@/lib/game/station-search";

type StationSearchProps = {
    /** Every station a player can guess: the `stations` operation's answer. */
    stations: readonly StationOption[];
    /** The codes of the stations guessed so far, which are not offered again. */
    guessed: readonly string[];
    /** Which guess this is, from 1. */
    guessNumber: number;
    /** How many guesses the puzzle allows. */
    maxGuesses: number;
    /** Called with the station guessed; the search then empties itself. */
    onGuess: (station: StationOption) => void;
};

function stationLabel(station: StationOption): string {
    return station.name;
}

function isSameStation(a: StationOption, b: StationOption): boolean {
    return a.code === b.code;
}

/**
 * The guess input from the design (Web · Playing): a search box with the
 * Guess button, and a list of the stations the typed text matches
 * (docs/station-search.md).
 */
export function StationSearch({
    stations,
    guessed,
    guessNumber,
    maxGuesses,
    onGuess,
}: StationSearchProps) {
    const inputId = useId();
    const boxRef = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<StationOption | null>(null);
    const [open, setOpen] = useState(false);

    const guessedCodes = useMemo(() => new Set(guessed), [guessed]);
    const candidates = useMemo(
        () => stations.filter((station) => !guessedCodes.has(station.code)),
        [stations, guessedCodes],
    );
    const matches = useMemo(
        () => searchStations(candidates, query, guessedCodes),
        [candidates, query, guessedCodes],
    );
    const hasQuery = foldForSearch(query).length > 0;

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        // The picked station, unless the text was changed after picking it;
        // else a name typed out in full.
        const station =
            selected != null && foldForSearch(selected.name) === foldForSearch(query)
                ? selected
                : findStationByName(candidates, query, guessedCodes);
        if (station == null) {
            // Show what the text does match, so the player can pick one.
            setOpen(hasQuery);
            return;
        }
        onGuess(station);
        setQuery("");
        setSelected(null);
        setOpen(false);
    }

    return (
        <Combobox
            items={candidates}
            filteredItems={matches}
            value={selected}
            onValueChange={setSelected}
            inputValue={query}
            onInputValueChange={(value, details) => {
                // Base UI empties the text when the list closes without a
                // pick (Escape, a click outside, the Guess button). Keep it:
                // a name typed out in full can be guessed as it is.
                if (details.reason !== "input-clear") {
                    setQuery(value);
                }
            }}
            // Nothing to offer before the player types.
            open={open && hasQuery}
            onOpenChange={setOpen}
            itemToStringLabel={stationLabel}
            isItemEqualToValue={isSameStation}
            autoHighlight
        >
            <form onSubmit={handleSubmit} className="w-full max-w-180">
                <div
                    ref={boxRef}
                    data-slot="combobox-box"
                    // The site's focus ring goes round the whole box, for the
                    // input and the Guess button alike: the button sits flush
                    // in the box, so its own ring would cut across the border.
                    className="flex items-center gap-2.5 rounded-xl border-2 border-input bg-surface py-1.5 pr-1.5 pl-4.5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-solid"
                >
                    <SearchIcon
                        aria-hidden="true"
                        className="size-5 shrink-0 text-muted-foreground"
                    />
                    <label htmlFor={inputId} className="sr-only">
                        {m["stationSearch.label"]()}
                    </label>
                    <ComboboxInput
                        id={inputId}
                        autoComplete="off"
                        placeholder={m["stationSearch.placeholder"]({
                            number: guessNumber,
                            total: maxGuesses,
                        })}
                        className="h-12 flex-1 text-xl font-medium"
                    />
                    <Button
                        type="submit"
                        size="lg"
                        // Inside the box's ring, which way focus is: a ring in
                        // the button's own text colour, inset.
                        className="focus-visible:outline-primary-foreground focus-visible:outline-offset-[-6px]"
                    >
                        {m["stationSearch.submit"]()}
                    </Button>
                </div>
            </form>
            <ComboboxContent anchor={boxRef}>
                <ComboboxEmpty>
                    {m["stationSearch.noMatch"]({ query: query.trim() })}
                </ComboboxEmpty>
                <ComboboxList aria-label={m["stationSearch.list"]()}>
                    {(station: StationOption) => (
                        <ComboboxItem
                            key={station.code}
                            value={station}
                            // Read as "Amsterdam Centraal, Noord-Holland".
                            aria-label={`${station.name}, ${station.province}`}
                            className="justify-between"
                        >
                            <StationMatchName name={station.name} query={query} />
                            <span className="shrink-0 text-[15px] text-muted-foreground">
                                {station.province}
                            </span>
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
