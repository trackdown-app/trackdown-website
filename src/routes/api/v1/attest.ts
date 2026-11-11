import { createFileRoute } from "@tanstack/react-router";
import { attestHandlers } from "@/lib/api/v1-handlers";

export const Route = createFileRoute("/api/v1/attest")({
    server: { handlers: attestHandlers },
});
