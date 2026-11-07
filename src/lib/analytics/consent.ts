import { z } from "zod";

export const CONSENT_COOKIE_NAME = "trackdown-consent";
export const CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
/** Raise this when the banner's text or what acceptance allows changes. */
export const CONSENT_TEXT_VERSION = 1;
export const consentSettingsParameter = "cookie-settings";

export const consentChoiceSchema = z.object({ analytics: z.boolean() });
export type ConsentChoice = z.infer<typeof consentChoiceSchema>;

const consentRecordSchema = z.object({
    choice: consentChoiceSchema,
    version: z.number().int(),
    givenAt: z.iso.datetime(),
});

export function createConsentRecord(choice: ConsentChoice, givenAt: Date) {
    return {
        choice,
        version: CONSENT_TEXT_VERSION,
        givenAt: givenAt.toISOString(),
    };
}

/** The framework decodes the cookie before this reads its JSON record. */
export function parseConsentCookie(
    value: string | null | undefined,
): ConsentChoice | null {
    if (value == null) return null;
    let record: unknown;
    try {
        record = JSON.parse(value);
    } catch {
        return null;
    }
    const parsed = consentRecordSchema.safeParse(record);
    return parsed.success && parsed.data.version === CONSENT_TEXT_VERSION
        ? parsed.data.choice
        : null;
}
