import { createFileRoute } from "@tanstack/react-router";
import { todayPuzzleHandlers } from "@/lib/api/v1-handlers";

export const Route = createFileRoute("/api/v1/$network/puzzles/today")({
    server: { handlers: todayPuzzleHandlers },
});
