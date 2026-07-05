import { create } from "zustand";
const PIN_KEY = "gv-os.pin";
const LOCKED_KEY = "gv-os.locked";
async function sha(text) {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
export const useLock = create((set, get) => ({
    hasPin: false,
    locked: false,
    hydrate: () => {
        if (typeof window === "undefined")
            return;
        const hasPin = !!localStorage.getItem(PIN_KEY);
        const locked = hasPin && localStorage.getItem(LOCKED_KEY) !== "false";
        set({ hasPin, locked });
    },
    setPin: async (pin) => {
        const hash = await sha(pin);
        localStorage.setItem(PIN_KEY, hash);
        localStorage.setItem(LOCKED_KEY, "false");
        set({ hasPin: true, locked: false });
    },
    clearPin: async () => {
        localStorage.removeItem(PIN_KEY);
        localStorage.removeItem(LOCKED_KEY);
        set({ hasPin: false, locked: false });
    },
    lock: () => {
        if (!get().hasPin)
            return;
        localStorage.setItem(LOCKED_KEY, "true");
        set({ locked: true });
    },
    unlock: async (pin) => {
        const expect = localStorage.getItem(PIN_KEY);
        const hash = await sha(pin);
        if (expect && expect === hash) {
            localStorage.setItem(LOCKED_KEY, "false");
            set({ locked: false });
            return true;
        }
        return false;
    },
}));
