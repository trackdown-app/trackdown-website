import { createFileRoute } from "@tanstack/react-router";
import { openApiHandlers } from "@/lib/api/v1-handlers";

export const Route = createFileRoute("/api/v1/openapi.json")({
    server: { handlers: openApiHandlers },
});
