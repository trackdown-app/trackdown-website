import { m } from "@/paraglide/messages";
import { LegalPage } from "@/components/legal/legal-page";
import { LegalSection } from "@/components/legal/legal-section";
import { MailLink } from "@/components/legal/mail-link";

/**
 * The privacy policy (docs/about-privacy-terms.md), after the design's Web · Privacy
 * policy board: the short version in a card, then what is stored where,
 * PostHog with and without its cookie, the Cloudflare proxy in front of it,
 * the server's logs, who else gets data, your rights and changes.
 */
export function PrivacyPage() {
    return (
        <LegalPage
            updated={m["privacy.updated"]()}
            title={m["privacy.title"]()}
            intro={m["privacy.intro"]()}
        >
            <section
                aria-labelledby="privacy-short"
                className="flex flex-col gap-3.5 rounded-[14px] border-2 border-foreground bg-surface p-6"
            >
                <h2
                    id="privacy-short"
                    className="font-condensed text-[30px] leading-none font-bold"
                >
                    {m["privacy.shortTitle"]()}
                </h2>
                <ul className="flex list-disc flex-col gap-2 pl-[22px]">
                    <li>{m["privacy.short1"]()}</li>
                    <li>{m["privacy.short2"]()}</li>
                    <li>{m["privacy.short3"]()}</li>
                    <li>{m["privacy.short4"]()}</li>
                </ul>
            </section>
            <LegalSection id="privacy-who" title={m["privacy.whoTitle"]()}>
                <p>
                    {m["privacy.whoBefore"]()} <MailLink />
                    {m["privacy.whoAfter"]()}
                </p>
            </LegalSection>
            <LegalSection id="privacy-device" title={m["privacy.deviceTitle"]()}>
                <p>{m["privacy.deviceStorage"]()}</p>
                <p>{m["privacy.deviceCookies"]()}</p>
            </LegalSection>
            <LegalSection
                id="privacy-analytics"
                title={m["privacy.analyticsTitle"]()}
            >
                <p>{m["privacy.analyticsWhy"]()}</p>
                <p>
                    <strong>{m["privacy.analyticsCookielessLead"]()}</strong>{" "}
                    {m["privacy.analyticsCookieless"]()}
                </p>
                <p>
                    <strong>{m["privacy.analyticsCookieLead"]()}</strong>{" "}
                    {m["privacy.analyticsCookie"]()}
                </p>
                <p>{m["privacy.analyticsProxy"]()}</p>
                <p>{m["privacy.analyticsRetention"]()}</p>
            </LegalSection>
            <LegalSection id="privacy-server" title={m["privacy.serverTitle"]()}>
                <p>{m["privacy.serverBody"]()}</p>
            </LegalSection>
            <LegalSection id="privacy-others" title={m["privacy.othersTitle"]()}>
                <p>{m["privacy.othersBody"]()}</p>
            </LegalSection>
            <LegalSection id="privacy-rights" title={m["privacy.rightsTitle"]()}>
                <p>
                    {m["privacy.rightsBefore"]()} <MailLink />{" "}
                    {m["privacy.rightsAfter"]()}
                </p>
            </LegalSection>
            <LegalSection id="privacy-changes" title={m["privacy.changesTitle"]()}>
                <p>{m["privacy.changesBody"]()}</p>
            </LegalSection>
        </LegalPage>
    );
}
