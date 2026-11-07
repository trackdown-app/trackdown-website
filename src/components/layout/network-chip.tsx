import { cn } from "@/lib/utils";
import type { RegionCode } from "@/lib/data/networks";

type NetworkChipProps = {
    region: RegionCode;
    /** A network not playable yet: soft instead of ink. */
    upcoming?: boolean;
    className?: string;
};

/**
 * A network's country code in a pill, as the design draws it on the header's
 * network pill and the picker's rows. The name beside it says the same, so
 * a screen reader skips the code.
 */
export function NetworkChip({
    region,
    upcoming = false,
    className,
}: NetworkChipProps) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                "inline-flex items-center justify-center rounded-full font-bold",
                upcoming ? "bg-soft text-foreground" : "bg-ink text-background",
                className,
            )}
        >
            {region}
        </span>
    );
}
