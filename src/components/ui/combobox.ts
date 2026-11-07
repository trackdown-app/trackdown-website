import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";

/**
 * shadcn/ui's combobox (base-vega), split one part per file and trimmed to
 * the parts the station search uses: this root, `ComboboxInput`,
 * `ComboboxContent`, `ComboboxList`, `ComboboxItem` and `ComboboxEmpty`.
 * Its input group, trigger, clear button, chips, groups and check mark are
 * left out: the station search draws its own input box (the design's).
 */
export const Combobox = ComboboxPrimitive.Root;
