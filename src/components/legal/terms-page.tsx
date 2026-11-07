import { Link } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { LegalPage } from "@/components/legal/legal-page";
import { LegalSection } from "@/components/legal/legal-section";
import { MailLink } from "@/components/legal/mail-link";
import { textLink } from "@/components/legal/text-link";

/**
 * The terms of use (docs/about-privacy-terms.md), after the design's Web ·
 * Terms of use board.
 */
export function TermsPage() {
    return (
        <LegalPage
            updated={m["terms.updated"]()}
            title={m["terms.title"]()}
            intro={m["terms.intro"]()}
        >
            <LegalSection id="terms-free" title={m["terms.freeTitle"]()}>
                <p>{m["terms.freeBody"]()}</p>
            </LegalSection>
            <LegalSection id="terms-planner" title={m["terms.plannerTitle"]()}>
                <p>{m["terms.plannerData"]()}</p>
                <p>{m["terms.plannerIndependent"]()}</p>
            </LegalSection>
            <LegalSection id="terms-fair" title={m["terms.fairTitle"]()}>
                <p>{m["terms.fairBody"]()}</p>
            </LegalSection>
            <LegalSection id="terms-own" title={m["terms.ownTitle"]()}>
                <p>{m["terms.ownBody"]()}</p>
            </LegalSection>
            <LegalSection id="terms-liability" title={m["terms.liabilityTitle"]()}>
                <p>{m["terms.liabilityBody"]()}</p>
            </LegalSection>
            <LegalSection id="terms-privacy" title={m["terms.privacyTitle"]()}>
                <p>
                    {m["terms.privacyBefore"]()}{" "}
                    <Link to="/privacy" className={textLink}>
                        {m["terms.privacyLink"]()}
                    </Link>
                    {m["terms.privacyAfter"]()}
                </p>
            </LegalSection>
            <LegalSection id="terms-changes" title={m["terms.changesTitle"]()}>
                <p>
                    {m["terms.changesBefore"]()} <MailLink />
                    {m["terms.changesAfter"]()}
                </p>
            </LegalSection>
        </LegalPage>
    );
}
