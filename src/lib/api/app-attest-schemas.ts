import { z } from "@/lib/zod";

export const attestKeyIdSchema = z.string().regex(/^[A-Za-z0-9+/]{43}=$/);
export const challengeInputSchema = z.object({ keyId: attestKeyIdSchema });
export const challengeOutputSchema = z.object({ challenge: z.string() });
export const attestInputSchema = challengeInputSchema.extend({
    challenge: z.string().regex(/^[a-f0-9]{64}$/),
    attestation: z
        .string()
        .min(1)
        .max(24000)
        .regex(/^[A-Za-z0-9+/]+={0,2}$/),
});
export const attestOutputSchema = z.object({ registered: z.boolean() });
