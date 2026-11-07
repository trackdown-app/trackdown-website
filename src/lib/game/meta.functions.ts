import { createServerFn } from "@tanstack/react-start";
import { getMeta } from "@/lib/game/meta";
import { metaInputSchema } from "@/lib/game/schemas";
import { serviceContext } from "@/lib/game/service-context";

/** The `meta` operation for the web; `GET /api/v1/meta` is the same for iOS. */
export const getMetaFn = createServerFn({ method: "GET" })
    .validator(metaInputSchema)
    .handler(({ data }) => getMeta(data, serviceContext));
