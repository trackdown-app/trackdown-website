import { createFileRoute } from "@tanstack/react-router";
import { stationsHandlers } from "@/lib/api/v1-handlers";

export const Route = createFileRoute("/api/v1/$network/stations")({
    server: { handlers: stationsHandlers },
});
