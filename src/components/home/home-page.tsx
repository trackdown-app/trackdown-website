import { m } from "@/paraglide/messages";
import { LanguageSwitch } from "@/components/language/language-switch";

/** Placeholder home page until the real one is designed. */
export function HomePage() {
    return (
        <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-4 px-6">
            <div className="self-end">
                <LanguageSwitch />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">
                {m["site.name"]()}
            </h1>
            <p className="text-muted-foreground">{m["home.comingSoon"]()}</p>
        </main>
    );
}
