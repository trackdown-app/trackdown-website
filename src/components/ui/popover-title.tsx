import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

/** shadcn/ui's popover title, which names the popup for screen readers. */
export function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
    return (
        <PopoverPrimitive.Title
            data-slot="popover-title"
            className={cn("font-medium", className)}
            {...props}
        />
    );
}
