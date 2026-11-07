import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui's popover popup, dressed as the design's plates: a surface with
 * an ink border, 16px corners and the popover shadow, like the station
 * search's suggestion list.
 */
export function PopoverContent({
    className,
    align = "center",
    alignOffset = 0,
    side = "bottom",
    sideOffset = 4,
    ...props
}: PopoverPrimitive.Popup.Props &
    Pick<
        PopoverPrimitive.Positioner.Props,
        "align" | "alignOffset" | "side" | "sideOffset"
    >) {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                side={side}
                sideOffset={sideOffset}
                className="isolate z-50"
            >
                <PopoverPrimitive.Popup
                    data-slot="popover-content"
                    className={cn(
                        "z-50 flex max-w-(--available-width) origin-(--transform-origin) flex-col gap-4 rounded-xl border-2 border-input bg-popover p-4 text-popover-foreground shadow-popover outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                        className,
                    )}
                    {...props}
                />
            </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
    );
}
