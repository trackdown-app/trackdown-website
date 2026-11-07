import { Link } from "@tanstack/react-router";
import { Check, ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { NetworkChip } from "@/components/layout/network-chip";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { PopoverContent } from "@/components/ui/popover-content";
import { PopoverTitle } from "@/components/ui/popover-title";
import {
    networkIds,
    networkName,
    networks,
    upcomingNetworks,
} from "@/lib/data/networks";
import { keepNetworkChoice } from "@/lib/network-choice";
import { useCurrentNetwork } from "@/lib/use-current-network";

const nameClasses = "font-condensed text-[22px] leading-[1.05] font-bold";

/**
 * The header's network pill and the picker it opens, after the design's
 * Web · Playing board (the pill) and iOS · Choose network board (the list)
 * (docs/network-picker.md). Every network the game has links to its game
 * and becomes the visitor's choice; the networks still to come are listed
 * under "Coming next" and do nothing.
 */
export function NetworkPicker() {
    const current = networks[useCurrentNetwork()];
    const locale = getLocale();
    const [open, setOpen] = useState(false);
    const upcomingId = useId();
    const currentName = networkName(current.region, locale);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                aria-label={`${m["header.network"]()}: ${currentName}. ${m["header.changeNetwork"]()}`}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-input bg-transparent pr-3 pl-1.5 text-[15px] font-semibold whitespace-nowrap text-foreground hover:bg-muted"
            >
                <NetworkChip
                    region={current.region}
                    className="px-[7px] py-[3px] text-xs"
                />
                {currentName}
                <ChevronDown
                    aria-hidden="true"
                    className="size-3.5"
                    strokeWidth={2.4}
                />
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-[min(22rem,calc(100vw-32px))]"
            >
                <div>
                    <PopoverTitle className="font-condensed text-[32px] leading-none font-extrabold">
                        {m["networkPicker.title"]()}
                    </PopoverTitle>
                    <p className="mt-2 text-[15px] leading-[1.4] text-muted-foreground">
                        {m["networkPicker.lead"]()}
                    </p>
                </div>
                <ul
                    aria-label={m["networkPicker.available"]()}
                    className="flex flex-col"
                >
                    {networkIds.map((id) => {
                        const network = networks[id];
                        const chosen = id === current.id;
                        return (
                            <li key={id}>
                                <Link
                                    to="/$network"
                                    params={{ network: id }}
                                    // The router marks the current network's
                                    // link `aria-current="page"` on any of
                                    // its pages; "Chosen" says so too.
                                    onClick={() => {
                                        keepNetworkChoice(id);
                                        setOpen(false);
                                    }}
                                    className="flex min-h-14 items-center gap-3.5 rounded-lg px-2 py-1.5 text-foreground no-underline hover:bg-soft"
                                >
                                    <NetworkChip
                                        region={network.region}
                                        className="size-11 text-[15px]"
                                    />
                                    <span className={`flex-1 ${nameClasses}`}>
                                        {networkName(network.region, locale)}
                                    </span>
                                    {chosen && (
                                        <span className="flex size-6 items-center justify-center rounded-full bg-line-1 text-on-line">
                                            <Check
                                                aria-hidden="true"
                                                className="size-4"
                                                strokeWidth={3}
                                            />
                                            <span className="sr-only">
                                                {m["networkPicker.chosen"]()}
                                            </span>
                                        </span>
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
                {upcomingNetworks.length > 0 && (
                    <section
                        aria-labelledby={upcomingId}
                        className="flex flex-col gap-2"
                    >
                        <h3
                            id={upcomingId}
                            className="px-2 text-[15px] font-semibold text-muted-foreground"
                        >
                            {m["networkPicker.upcoming"]()}
                        </h3>
                        <ul className="flex flex-col">
                            {upcomingNetworks.map((region) => (
                                <li
                                    key={region}
                                    className="flex min-h-14 items-center gap-3.5 border-t border-rule px-2 py-1.5 first:border-t-0"
                                >
                                    <NetworkChip
                                        region={region}
                                        upcoming
                                        className="size-11 text-[15px]"
                                    />
                                    <span className="flex flex-1 flex-col">
                                        <span className={nameClasses}>
                                            {networkName(region, locale)}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {m["networkPicker.comingLater"]()}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </PopoverContent>
        </Popover>
    );
}
