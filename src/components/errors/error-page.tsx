import { Link, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorLayout } from "@/components/errors/error-layout";
import { logRouteError } from "@/lib/log-route-error";

/**
 * The router's default error component, for an error a route's `beforeLoad`
 * or loader throws. The router answers it with HTTP 500. The visitor never
 * sees the error itself; the server log does.
 */
export function ErrorPage({ error }: ErrorComponentProps) {
    const router = useRouter();

    // Runs during the server render only; a no-op in the browser.
    logRouteError(error);

    return (
        <ErrorLayout
            label={m["error.label"]()}
            title={m["error.title"]()}
            lead={m["error.lead"]()}
        >
            <Button
                size="lg"
                onClick={() => {
                    void router.invalidate();
                }}
            >
                {m["error.retry"]()}
            </Button>
            <Link
                to="/"
                className={buttonVariants({ variant: "outline", size: "lg" })}
            >
                {m["error.home"]()}
            </Link>
        </ErrorLayout>
    );
}
