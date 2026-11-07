import { useEffect, useState } from "react";
import type { RefObject } from "react";

/**
 * The width of `ref`'s element, in px, kept up to date as it resizes.
 * `initial` until the browser has measured it: in the server render, and
 * where `ResizeObserver` does not exist.
 */
export function useElementWidth(
    ref: RefObject<HTMLElement | null>,
    initial: number,
): number {
    const [width, setWidth] = useState(initial);

    useEffect(() => {
        const element = ref.current;
        if (element == null || typeof ResizeObserver === "undefined") {
            return;
        }
        const observer = new ResizeObserver(([entry]) => {
            if (entry != null && entry.contentRect.width > 0) {
                setWidth(entry.contentRect.width);
            }
        });
        observer.observe(element);
        return () => {
            observer.disconnect();
        };
    }, [ref]);

    return width;
}
