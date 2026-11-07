import { definePlugin } from "nitro";
import { startTelemetry } from "@/lib/logging/telemetry";

/** Providers start once per warm instance, before the first request. */
export default definePlugin((app) => {
    const telemetry = startTelemetry();
    app.hooks.hook("close", () => telemetry.shutdown());
});
