import { createFileRoute } from "@tanstack/react-router";
import { attestChallengeHandlers } from "@/lib/api/v1-handlers";

export const Route = createFileRoute("/api/v1/attest/challenge")({
    server: { handlers: attestChallengeHandlers },
});
