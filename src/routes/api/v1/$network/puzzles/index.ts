import { createFileRoute } from "@tanstack/react-router";
import { puzzleArchiveHandlers } from "@/lib/api/v1-handlers";

export const Route = createFileRoute("/api/v1/$network/puzzles/")({
    server: { handlers: puzzleArchiveHandlers },
});
