import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

/** shadcn/ui's dialog title: names the dialog for screen readers. */
export function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn("leading-none font-medium", className)}
            {...props}
        />
    );
}
