import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui's combobox option, sized as the design's suggestions: 52px
 * high, 10px corners, 18px text, `soft` behind the highlighted one. No
 * check mark: the design picks a station, it does not tick one.
 */
export function ComboboxItem({ className, ...props }: ComboboxPrimitive.Item.Props) {
    return (
        <ComboboxPrimitive.Item
            data-slot="combobox-item"
            className={cn(
                "relative flex min-h-13 w-full cursor-pointer items-center gap-3 rounded-md px-3.5 text-[18px] outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-soft",
                className,
            )}
            {...props}
        />
    );
}
