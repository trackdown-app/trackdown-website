import { matchName } from "@/lib/game/station-search";

/** A station's name with the part `query` matched in bold, as the design draws it. */
export function StationMatchName({ name, query }: { name: string; query: string }) {
    const match = matchName(name, query);
    if (match == null) {
        return <span>{name}</span>;
    }
    return (
        <span>
            {name.slice(0, match.start)}
            <strong className="font-bold">
                {name.slice(match.start, match.end)}
            </strong>
            {name.slice(match.end)}
        </span>
    );
}
