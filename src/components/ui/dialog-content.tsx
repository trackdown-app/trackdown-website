import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type DialogContentProps = DialogPrimitive.Popup.Props & {
    /** The close button's name for screen readers, in the page's language. */
    closeLabel: string;
};

/**
 * shadcn/ui's dialog popup with its backdrop and close button, dressed in the
 * design's surface: a `card` plate with 16px corners and the popover shadow,
 * and the site's 44px icon button to close it. The close label is a prop,
 * as shadcn's is English only.
 */
export function DialogContent({
    className,
    children,
    closeLabel,
    ...props
}: DialogContentProps) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Backdrop
                data-slot="dialog-overlay"
                className="fixed inset-0 isolate z-50 bg-black/30 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
            />
            <DialogPrimitive.Popup
                data-slot="dialog-content"
                className={cn(
                    "fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100svh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 overflow-y-auto rounded-xl bg-card p-6 text-card-foreground shadow-popover duration-100 sm:max-w-lg sm:p-8 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                    className,
                )}
                {...props}
            >
                {children}
                <DialogPrimitive.Close
                    data-slot="dialog-close"
                    render={
                        <Button
                            variant="ghost"
                            size="icon-lg"
                            className="absolute top-3 right-3"
                        />
                    }
                    aria-label={closeLabel}
                >
                    <XIcon aria-hidden="true" className="size-5" />
                </DialogPrimitive.Close>
            </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
    );
}
