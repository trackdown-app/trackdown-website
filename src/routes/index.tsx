import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * `/` has no page of its own: it sends the visitor to today's game of the
 * network they chose last, or the default one (docs/network-picker.md).
 */
export const Route = createFileRoute("/")({
    beforeLoad: ({ context }) => {
        throw redirect({
            to: "/$network",
            params: { network: context.chosenNetwork },
        });
    },
});
