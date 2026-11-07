import { Link } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { LegalPage } from "@/components/legal/legal-page";
import { LegalSection } from "@/components/legal/legal-section";
import { MailLink } from "@/components/legal/mail-link";
import { textLink } from "@/components/legal/text-link";

const openGovernmentLicence =
    "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/";

/**
 * The About page (docs/about-privacy-terms.md): what Trackdown is, how its
 * trips are worked out, the open data it is built on with the attribution
 * its licences ask for, that it is not linked to any railway, and how to get
 * in touch. The design draws no board for it, so it takes the Privacy
 * policy board's layout.
 */
export function AboutPage() {
    return (
        <LegalPage title={m["about.title"]()} intro={m["about.intro"]()}>
            <LegalSection id="about-game" title={m["about.gameTitle"]()}>
                <p>{m["about.gameBody"]()}</p>
                <p>
                    <Link to="/hoe-te-spelen" className={textLink}>
                        {m["about.gameLink"]()}
                    </Link>
                </p>
            </LegalSection>
            <LegalSection id="about-trips" title={m["about.tripsTitle"]()}>
                <p>{m["about.tripsBody"]()}</p>
            </LegalSection>
            <LegalSection id="about-data" title={m["about.dataTitle"]()}>
                <p>{m["about.dataIntro"]()}</p>
                <ul className="flex list-disc flex-col gap-2 pl-[22px]">
                    <li>
                        {m["about.dataTimetable"]()}{" "}
                        <a
                            href="https://creativecommons.org/publicdomain/zero/1.0/"
                            className={textLink}
                        >
                            CC0 1.0
                        </a>
                    </li>
                    <li>
                        {m["about.dataBorders"]()}{" "}
                        <a
                            href="https://creativecommons.org/licenses/by/4.0/"
                            className={textLink}
                        >
                            CC BY 4.0
                        </a>
                    </li>
                </ul>
                <p>
                    {m["about.dataGbIntro"]()}{" "}
                    <a
                        href="https://creativecommons.org/licenses/by-sa/4.0/"
                        className={textLink}
                    >
                        CC BY-SA 4.0
                    </a>
                </p>
                <ul className="flex list-disc flex-col gap-2 pl-[22px]">
                    <li>
                        {m["about.dataGbTimetable"]()}{" "}
                        <a
                            href="https://creativecommons.org/licenses/by-sa/4.0/"
                            className={textLink}
                        >
                            CC BY-SA 4.0
                        </a>
                    </li>
                    <li>
                        {m["about.dataGbStations"]()}{" "}
                        <a href={openGovernmentLicence} className={textLink}>
                            OGL v3.0
                        </a>
                    </li>
                    <li>
                        {m["about.dataGbRegions"]()}{" "}
                        <a href={openGovernmentLicence} className={textLink}>
                            OGL v3.0
                        </a>
                    </li>
                </ul>
            </LegalSection>
            <LegalSection
                id="about-independent"
                title={m["about.independentTitle"]()}
            >
                <p>{m["about.independentBody"]()}</p>
            </LegalSection>
            <LegalSection id="about-contact" title={m["about.contactTitle"]()}>
                <p>
                    {m["legal.contactBefore"]()} <MailLink />
                    {m["legal.contactAfter"]()}
                </p>
            </LegalSection>
        </LegalPage>
    );
}
