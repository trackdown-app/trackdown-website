import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui's combobox list. Six of the design's 52px options show at once
 * (6px padding around them); the rest scroll.
 */
export function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
    return (
        <ComboboxPrimitive.List
            data-slot="combobox-list"
            className={cn(
                "max-h-[min(calc(--spacing(78)+--spacing(3)),var(--available-height))] scroll-py-1.5 overflow-y-auto overscroll-contain p-1.5 data-empty:p-0",
                className,
            )}
            {...props}
        />
    );
}
