import { m } from "@/paraglide/messages";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The `id` of the page's content, after the header, that the skip link jumps to. */
export const contentId = "content";

/**
 * The first stop for the keyboard on every page: a link past the header to
 * the page's content. It stays out of sight until it has focus, then shows
 * over the header's top left corner as a filled button. shadcn/ui has no
 * skip link, hence this one.
 */
export function SkipLink() {
    return (
        <a
            href={`#${contentId}`}
            className={cn(
                buttonVariants(),
                "fixed top-4 left-4 z-50 not-focus:sr-only",
            )}
        >
            {m["header.skipToContent"]()}
        </a>
    );
}
