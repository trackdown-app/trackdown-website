import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";

/** shadcn/ui's combobox empty state: shown only while no option matches. */
export function ComboboxEmpty({
    className,
    ...props
}: ComboboxPrimitive.Empty.Props) {
    return (
        <ComboboxPrimitive.Empty
            data-slot="combobox-empty"
            className={cn(
                "hidden w-full px-3.5 py-3.5 text-base text-muted-foreground group-data-empty/combobox-content:flex",
                className,
            )}
            {...props}
        />
    );
}
