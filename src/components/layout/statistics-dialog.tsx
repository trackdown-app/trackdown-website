import { ChartNoAxesColumn } from "lucide-react";
import { m } from "@/paraglide/messages";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { DialogContent } from "@/components/ui/dialog-content";
import { DialogTitle } from "@/components/ui/dialog-title";
import { StatisticsRecord } from "@/components/game/statistics-record";
import { networkName } from "@/lib/game/network-name";
import { todayNetwork } from "@/lib/game/today-network";

/**
 * The header's statistics button and the dialog it opens
 * (docs/statistics.md#the-dialog): the record at today's network, as the
 * solved screen shows it. The record is only read once the dialog opens, so
 * a page that never opens it never asks for the archive.
 */
export function StatisticsDialog() {
    return (
        <Dialog>
            <DialogTrigger
                render={<Button variant="ghost" size="icon-lg" />}
                aria-label={m["header.statistics"]()}
            >
                <ChartNoAxesColumn aria-hidden="true" className="size-[22px]" />
            </DialogTrigger>
            <DialogContent closeLabel={m["statistics.close"]()}>
                <DialogTitle className="pr-10 font-condensed text-[32px] leading-tight font-bold">
                    {m["statistics.title"]({ network: networkName(todayNetwork) })}
                </DialogTitle>
                <StatisticsRecord network={todayNetwork} />
            </DialogContent>
        </Dialog>
    );
}
