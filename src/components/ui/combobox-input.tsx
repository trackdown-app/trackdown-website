import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui's combobox input without its input group: a bare text field,
 * for a box the caller draws around it. The caller shows focus on that box,
 * so the field drops its own outline only inside one (`data-slot=
 * "combobox-box"`).
 */
export function ComboboxInput({
    className,
    ...props
}: ComboboxPrimitive.Input.Props) {
    return (
        <ComboboxPrimitive.Input
            data-slot="combobox-input"
            className={cn(
                "w-full min-w-0 bg-transparent placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 in-data-[slot=combobox-box]:outline-none",
                className,
            )}
            {...props}
        />
    );
}
