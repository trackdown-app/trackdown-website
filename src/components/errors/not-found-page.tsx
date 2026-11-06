import { Link } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { buttonVariants } from "@/components/ui/button";
import { ErrorLayout } from "@/components/errors/error-layout";

/**
 * The router's default not-found component, for any URL no route matches and
 * any `notFound()` a route throws. The router answers it with HTTP 404.
 */
export function NotFoundPage() {
    return (
        <ErrorLayout
            label={m["notFound.label"]()}
            title={m["notFound.title"]()}
            lead={m["notFound.lead"]()}
        >
            <Link to="/" className={buttonVariants({ size: "lg" })}>
                {m["notFound.home"]()}
            </Link>
        </ErrorLayout>
    );
}
