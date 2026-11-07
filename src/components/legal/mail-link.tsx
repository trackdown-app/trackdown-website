import { contactEmail } from "@/lib/contact";
import { textLink } from "@/components/legal/text-link";

/** The contact address as a `mailto:` link, inside running text. */
export function MailLink() {
    return (
        <a href={`mailto:${contactEmail}`} className={textLink}>
            {contactEmail}
        </a>
    );
}
