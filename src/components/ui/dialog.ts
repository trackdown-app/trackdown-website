import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

/**
 * shadcn/ui's dialog (base-vega), split one part per file and trimmed to the
 * parts the statistics dialog uses: this root and trigger, `DialogContent`
 * and `DialogTitle`. Its header, footer, description and portal parts are
 * left out.
 */
export const Dialog = DialogPrimitive.Root;

export const DialogTrigger = DialogPrimitive.Trigger;
