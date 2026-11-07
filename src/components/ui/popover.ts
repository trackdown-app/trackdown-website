import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

/**
 * shadcn/ui's popover (base-vega), split one part per file and trimmed to
 * the parts the network picker uses: this root, its trigger,
 * `PopoverContent` and `PopoverTitle`. The header and description wrappers
 * are left out: the picker lays out its own heading and lead.
 */
export const Popover = PopoverPrimitive.Root;

export const PopoverTrigger = PopoverPrimitive.Trigger;
