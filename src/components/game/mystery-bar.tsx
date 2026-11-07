import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import type { ListedGuess } from "@/lib/game/trip-line";
import { cn } from "@/lib/utils";

/** A map-specific terminal bar; shadcn/ui has no trip-map primitive. */
export function MysteryBar({
    listRef,
    guesses,
    revealed,
}: {
    listRef: RefObject<HTMLOListElement | null>;
    guesses: readonly ListedGuess[];
    revealed: boolean;
}) {
    const [position, setPosition] = useState<{
        top: number;
        height: number;
    } | null>(null);

    useLayoutEffect(() => {
        const list = listRef.current;
        if (list == null) {
            return;
        }
        const ends = [...list.querySelectorAll<HTMLElement>("[data-trip-end]")];
        const first = ends.at(0);
        const last = ends.at(-1);
        function update() {
            if (list == null || first == null || last == null) {
                return;
            }
            const firstRect = first.getBoundingClientRect();
            const lastRect = last.getBoundingClientRect();
            const firstCentre = firstRect.top + firstRect.height / 2;
            const lastCentre = lastRect.top + lastRect.height / 2;
            setPosition({
                top: firstCentre - list.getBoundingClientRect().top - 15,
                height: lastCentre - firstCentre + 30,
            });
        }
        update();

        if (typeof ResizeObserver === "undefined") {
            return;
        }
        const observer = new ResizeObserver(update);
        observer.observe(list);
        for (const row of list.children) {
            observer.observe(row);
        }
        for (const end of ends) {
            observer.observe(end);
        }
        return () => {
            observer.disconnect();
        };
    }, [listRef, guesses, revealed]);

    return (
        <span
            aria-hidden="true"
            className={cn(
                "absolute right-0 z-2 w-[26px] rounded-[13px]",
                revealed ? "bg-ink" : "border-4 border-ink bg-surface",
            )}
            style={position ?? { visibility: "hidden" }}
        />
    );
}
