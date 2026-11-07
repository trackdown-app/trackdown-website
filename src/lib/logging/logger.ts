import { logs, SeverityNumber } from "@opentelemetry/api";
import { safeAttributes } from "@/lib/logging/attributes";
import type { TelemetryAttributes } from "@/lib/logging/attributes";

type Level = "info" | "warn" | "error";
type Scope = "server" | "http" | "api" | "console";
type Message =
    | "Server started"
    | "Server started; console only"
    | "Request completed"
    | "Request failed"
    | "API operation failed"
    | "Console warning; details suppressed"
    | "Console error; details suppressed"
    | "Telemetry export failed";

type Output = Pick<Console, Level>;

declare global {
    var trackdownConsoleOutput: Output | undefined;
}

export function consoleOutput(): Output {
    return globalThis.trackdownConsoleOutput ?? console;
}

/** Fixed messages and approved metadata only, including on the local console. */
export function createLogger(scope: Scope) {
    function write(
        level: Level,
        message: Message,
        attributes: TelemetryAttributes = {},
    ) {
        const approved = safeAttributes(attributes);
        consoleOutput()[level](`[${scope}] ${message}`, approved);
        logs.getLogger(scope).emit({
            severityText: level,
            severityNumber: {
                info: SeverityNumber.INFO,
                warn: SeverityNumber.WARN,
                error: SeverityNumber.ERROR,
            }[level],
            body: message,
            attributes: approved,
        });
    }
    return {
        info: (message: Message, attributes?: TelemetryAttributes) =>
            write("info", message, attributes),
        warn: (message: Message, attributes?: TelemetryAttributes) =>
            write("warn", message, attributes),
        error: (message: Message, attributes?: TelemetryAttributes) =>
            write("error", message, attributes),
    };
}

/** Framework errors can embed input or game files. Suppress all original arguments. */
export function installConsoleBridge(): void {
    if (globalThis.trackdownConsoleOutput != null) return;
    globalThis.trackdownConsoleOutput = {
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
    };
    const log = createLogger("console");
    console.warn = () => log.warn("Console warning; details suppressed");
    console.error = () => log.error("Console error; details suppressed");
}
