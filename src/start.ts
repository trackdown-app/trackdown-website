import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import { serverFunctionSpan } from "@/lib/logging/server-function-span";

export const startInstance = createStart(() => ({
    // Defining start.ts replaces Start's default options; preserve its CSRF check.
    requestMiddleware: [
        createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" }),
    ],
    functionMiddleware: [serverFunctionSpan],
}));
