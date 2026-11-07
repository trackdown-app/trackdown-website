import { ChartNoAxesColumn } from "lucide-react";
import { m } from "@/paraglide/messages";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { DialogContent } from "@/components/ui/dialog-content";
import { DialogTitle } from "@/components/ui/dialog-title";
import { StatisticsRecord } from "@/components/game/statistics-record";
import type { NetworkId } from "@/lib/data/networks";
import { networkName } from "@/lib/game/network-name";

type StatisticsDialogProps = {
    /** The header's current network (docs/network-picker.md#keeping-the-choice). */
    network: NetworkId;
};

/**
 * The header's statistics button and the dialog it opens
 * (docs/statistics.md#the-dialog): the record at the current network, as
 * the solved screen shows it. The record is only read once the dialog
 * opens, so a page that never opens it never asks for the archive.
 */
export function StatisticsDialog({ network }: StatisticsDialogProps) {
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
                    {m["statistics.title"]({ network: networkName(network) })}
                </DialogTitle>
                <StatisticsRecord network={network} />
            </DialogContent>
        </Dialog>
    );
}
