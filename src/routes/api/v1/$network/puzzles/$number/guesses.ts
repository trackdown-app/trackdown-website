import { createFileRoute } from "@tanstack/react-router";
import { guessHandlers } from "@/lib/api/v1-handlers";

export const Route = createFileRoute("/api/v1/$network/puzzles/$number/guesses")({
    server: { handlers: guessHandlers },
});
