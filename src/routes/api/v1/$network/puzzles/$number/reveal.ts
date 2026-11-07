import { createFileRoute } from "@tanstack/react-router";
import { revealHandlers } from "@/lib/api/v1-handlers";

export const Route = createFileRoute("/api/v1/$network/puzzles/$number/reveal")({
    server: { handlers: revealHandlers },
});
