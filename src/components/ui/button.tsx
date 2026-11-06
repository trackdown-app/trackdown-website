import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui's button (base-vega), trimmed to the variants the site uses and
 * sized to the design: 52px main buttons (`lg`, the Guess button) and 44px
 * icon buttons (`icon-lg`, the header's statistics button). Focus shows the
 * site-wide `:focus-visible` outline from `src/styles.css` instead of
 * shadcn's ring, so every control shows the same focus.
 */
export const buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-colors select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/80",
                outline:
                    "border-input bg-transparent text-foreground hover:bg-muted",
                ghost: "text-foreground hover:bg-muted",
            },
            size: {
                default: "h-11 gap-2 px-4 text-base",
                lg: "h-13 gap-2 px-6.5 text-[17px] font-semibold",
                "icon-lg": "size-11 rounded-full",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

export function Button({
    className,
    variant = "default",
    size = "default",
    ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
    return (
        <ButtonPrimitive
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}
