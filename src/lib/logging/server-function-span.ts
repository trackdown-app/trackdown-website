import { createMiddleware } from "@tanstack/react-start";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import {
    errorAttributes,
    functionNameSchema,
    operationAttributes,
} from "@/lib/logging/attributes";
import { withSpan } from "@/lib/logging/tracing";
import { annotateRequest, requestLogContext } from "@/lib/logging/request-metadata";

/** All server functions, including calls from SSR loaders; never record results. */
export const serverFunctionSpan = createMiddleware({ type: "function" }).server(
    ({ next, serverFnMeta, data }) => {
        const parsed = functionNameSchema.safeParse(serverFnMeta.name);
        const name = parsed.success ? parsed.data : "unknown";
        if (requestLogContext.getStore()?.["request.kind"] === "server-function") {
            annotateRequest({ "code.function.name": name });
            trace.getActiveSpan()?.setAttribute("code.function.name", name);
        }
        annotateRequest(operationAttributes(data));
        return withSpan(
            `server function ${name}`,
            {
                attributes: {
                    "code.function.name": name,
                    ...operationAttributes(data),
                },
            },
            async (span) => {
                const result = await next();
                // Start returns caught handler errors on next() as well as throws.
                if ("error" in result && result.error != null) {
                    span.setAttributes(errorAttributes(result.error));
                    span.setStatus({ code: SpanStatusCode.ERROR });
                } else {
                    if ("result" in result) {
                        span.setAttributes(operationAttributes(result.result));
                        annotateRequest(operationAttributes(result.result));
                    }
                    span.setAttribute("trackdown.outcome", "ok");
                }
                return result;
            },
        );
    },
);
