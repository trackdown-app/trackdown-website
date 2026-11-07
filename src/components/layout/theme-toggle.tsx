import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    isDarkTheme,
    serverDarkTheme,
    subscribeTheme,
    toggleTheme,
} from "@/lib/theme";
import { m } from "@/paraglide/messages";

/** The design has no theme control; reuse the header's shadcn icon button. */
export function ThemeToggle() {
    const dark = useSyncExternalStore(subscribeTheme, isDarkTheme, serverDarkTheme);
    return (
        <Button
            variant="ghost"
            size="icon-lg"
            aria-label={m["header.darkMode"]()}
            aria-pressed={dark}
            onClick={toggleTheme}
        >
            {/* CSS reflects the pre-paint theme even before hydration. */}
            <Moon aria-hidden="true" className="size-[22px] dark:hidden" />
            <Sun aria-hidden="true" className="hidden size-[22px] dark:block" />
        </Button>
    );
}
