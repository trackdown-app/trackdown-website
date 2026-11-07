import { createFileRoute } from "@tanstack/react-router";
import { metaHandlers } from "@/lib/api/v1-handlers";

export const Route = createFileRoute("/api/v1/meta")({
    server: { handlers: metaHandlers },
});
