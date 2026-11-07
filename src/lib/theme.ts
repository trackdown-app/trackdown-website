export const themeStorageKey = "trackdown:theme:v1";
const systemThemeQuery = "(prefers-color-scheme: dark)";
const themeChangeEvent = "trackdown:theme-change";
type Theme = "light" | "dark";

// Runs synchronously in the head, before the stylesheet or page can paint.
// Keep this self-contained: it must work before the app's JavaScript loads.
export const themeInitScript = `(()=>{let p;try{p=localStorage.getItem(${JSON.stringify(themeStorageKey)})}catch{}const r=document.documentElement;r.dataset.themePreference=p==="light"||p==="dark"?p:"system";r.dataset.theme=r.dataset.themePreference==="system"?(matchMedia(${JSON.stringify(systemThemeQuery)}).matches?"dark":"light"):r.dataset.themePreference})()`;

function parseTheme(value: string | null | undefined): Theme | null {
    return value === "light" || value === "dark" ? value : null;
}

function applyTheme(preference: Theme | null) {
    const root = document.documentElement;
    root.dataset["themePreference"] = preference ?? "system";
    root.dataset["theme"] =
        preference ??
        (window.matchMedia(systemThemeQuery).matches ? "dark" : "light");
}

export function isDarkTheme(): boolean {
    return document.documentElement.dataset["theme"] === "dark";
}

/** A stable server snapshot keeps the button's hydration deterministic. */
export function serverDarkTheme(): boolean {
    return false;
}

export function toggleTheme() {
    const theme = isDarkTheme() ? "light" : "dark";
    applyTheme(theme);
    try {
        window.localStorage.setItem(themeStorageKey, theme);
    } catch {
        // The DOM keeps the override for this visit when storage is blocked.
    }
    window.dispatchEvent(new Event(themeChangeEvent));
}

export function subscribeTheme(listener: () => void): () => void {
    const media = window.matchMedia(systemThemeQuery);
    function onSystemChange() {
        if (
            parseTheme(document.documentElement.dataset["themePreference"]) == null
        ) {
            applyTheme(null);
            listener();
        }
    }
    function onStorage(event: StorageEvent) {
        if (event.key === themeStorageKey || event.key == null) {
            applyTheme(parseTheme(event.newValue));
            listener();
        }
    }
    // Catch a system change between the head script and hydration.
    applyTheme(parseTheme(document.documentElement.dataset["themePreference"]));
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    window.addEventListener(themeChangeEvent, listener);
    return () => {
        media.removeEventListener("change", onSystemChange);
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(themeChangeEvent, listener);
    };
}
