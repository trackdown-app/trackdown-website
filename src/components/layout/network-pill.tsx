import { m } from "@/paraglide/messages";

/**
 * The header's network pill, as the design draws it, without the chevron:
 * the Netherlands is the only network, so there is nothing to choose yet and
 * the pill is a label, not a control. The network picker turns it into the
 * button that opens the picker (docs/site-shell.md#header).
 */
export function NetworkPill() {
    return (
        <p className="flex h-10 items-center gap-2 rounded-full border-[1.5px] border-input pr-3 pl-1.5 text-[15px] font-semibold whitespace-nowrap">
            <span className="sr-only">{`${m["header.network"]()}: `}</span>
            {/* The code repeats the name, so a screen reader skips it. */}
            <span
                aria-hidden="true"
                className="rounded-full bg-ink px-[7px] py-[3px] text-xs font-bold text-background"
            >
                NL
            </span>
            {m["header.networkNl"]()}
        </p>
    );
}
