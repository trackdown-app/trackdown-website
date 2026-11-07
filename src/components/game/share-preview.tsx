import { m } from "@/paraglide/messages";

type SharePreviewProps = {
    /** What the Share result button shares: `shareText`'s answer. */
    text: string;
};

/**
 * The design's "What you'll share" (docs/share.md#the-preview): the text the
 * Share result button hands on, exactly, and a line on why it holds no
 * station names.
 */
export function SharePreview({ text }: SharePreviewProps) {
    return (
        <section
            aria-labelledby="share-preview-title"
            className="flex max-w-xl flex-col gap-3.5"
        >
            <h2
                id="share-preview-title"
                className="font-condensed text-[32px] leading-tight font-bold"
            >
                {m["share.previewTitle"]()}
            </h2>
            <pre className="overflow-x-auto rounded-[14px] border border-border bg-card p-5 font-sans text-[17px] leading-[1.55] whitespace-pre text-foreground">
                {text}
            </pre>
            <p className="text-[15px] leading-normal text-muted-foreground">
                {m["share.previewNote"]()}
            </p>
        </section>
    );
}
