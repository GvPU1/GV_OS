import { create } from "zustand";
const STORAGE_KEY = "gv-os:theme";
function resolved(mode) {
    if (mode === "system") {
        if (typeof window === "undefined")
            return "dark";
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }
    return mode;
}
// Initial state is deterministic so SSR markup matches initial client render.
// Real preference loads in hydrate() (runs in a useEffect).
export const useTheme = create((set, get) => ({
    mode: "dark",
    hydrated: false,
    setMode: (m) => {
        if (typeof localStorage !== "undefined")
            localStorage.setItem(STORAGE_KEY, m);
        set({ mode: m });
        get().apply();
    },
    apply: () => {
        if (typeof document === "undefined")
            return;
        const r = resolved(get().mode);
        document.documentElement.classList.toggle("dark", r === "dark");
    },
    hydrate: () => {
        if (typeof localStorage === "undefined")
            return;
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored !== get().mode) {
            set({ mode: stored, hydrated: true });
        }
        else {
            set({ hydrated: true });
        }
        get().apply();
    },
}));
