import { createFileRoute } from "@tanstack/react-router";
import { unknownOperationHandlers } from "@/lib/api/v1-handlers";

export const Route = createFileRoute("/api/v1/$")({
    server: { handlers: unknownOperationHandlers },
});
