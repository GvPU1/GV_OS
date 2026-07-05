import { create } from "zustand";
const SCALE_KEY = "gv-os:scale";
const CLOCKS_KEY = "gv-os:clocks";
const RECENTS_KEY = "gv-os:recent-searches";
const APP_NAME_KEY = "gv-os:app-name";
const APP_LOGO_KEY = "gv-os:app-logo";
const LABELS_KEY = "gv-os:academic-labels";
const CLOCK_TZ_KEY = "gv-os:digital-clock-tz";
export const SCALE_FONT_PX = {
    compact: 13,
    default: 14,
    comfortable: 16,
    large: 18,
};
const DEFAULT_CLOCKS = [
    { label: "Local", timezone: "" },
    { label: "Qatar", timezone: "Asia/Qatar" },
    { label: "Germany", timezone: "Europe/Berlin" },
    { label: "India", timezone: "Asia/Kolkata" },
];
const DEFAULT_LABELS = { btech: "B.Tech", bs: "IITM BS" };
const lsSet = (k, v) => {
    if (typeof localStorage !== "undefined")
        localStorage.setItem(k, v);
};
export const useSettings = create((set, get) => ({
    scale: "default",
    clocks: DEFAULT_CLOCKS,
    recents: [],
    appName: "GV OS",
    appLogo: "GV",
    labels: DEFAULT_LABELS,
    digitalClockTz: "",
    setScale: (s) => {
        lsSet(SCALE_KEY, s);
        set({ scale: s });
        get().apply();
    },
    setClock: (idx, c) => {
        const next = get().clocks.slice();
        next[idx] = c;
        lsSet(CLOCKS_KEY, JSON.stringify(next));
        set({ clocks: next });
    },
    setClocks: (cs) => {
        lsSet(CLOCKS_KEY, JSON.stringify(cs));
        set({ clocks: cs });
    },
    setAppName: (n) => {
        const v = n.trim() || "GV OS";
        lsSet(APP_NAME_KEY, v);
        set({ appName: v });
    },
    setAppLogo: (l) => {
        lsSet(APP_LOGO_KEY, l);
        set({ appLogo: l });
    },
    setLabels: (l) => {
        lsSet(LABELS_KEY, JSON.stringify(l));
        set({ labels: l });
    },
    setDigitalClockTz: (tz) => {
        lsSet(CLOCK_TZ_KEY, tz);
        set({ digitalClockTz: tz });
    },
    pushRecent: (q) => {
        const t = q.trim();
        if (!t)
            return;
        const next = [t, ...get().recents.filter((r) => r !== t)].slice(0, 8);
        lsSet(RECENTS_KEY, JSON.stringify(next));
        set({ recents: next });
    },
    clearRecents: () => {
        if (typeof localStorage !== "undefined")
            localStorage.removeItem(RECENTS_KEY);
        set({ recents: [] });
    },
    apply: () => {
        if (typeof document === "undefined")
            return;
        document.documentElement.style.setProperty("font-size", `${SCALE_FONT_PX[get().scale]}px`);
    },
    hydrate: () => {
        if (typeof localStorage === "undefined")
            return;
        const s = localStorage.getItem(SCALE_KEY) || "default";
        const cRaw = localStorage.getItem(CLOCKS_KEY);
        const rRaw = localStorage.getItem(RECENTS_KEY);
        const lRaw = localStorage.getItem(LABELS_KEY);
        let clocks = DEFAULT_CLOCKS;
        let recents = [];
        let labels = DEFAULT_LABELS;
        try {
            if (cRaw)
                clocks = JSON.parse(cRaw);
            if (rRaw)
                recents = JSON.parse(rRaw);
            if (lRaw)
                labels = { ...DEFAULT_LABELS, ...JSON.parse(lRaw) };
        }
        catch {
            /* ignore */
        }
        set({
            scale: s,
            clocks,
            recents,
            labels,
            appName: localStorage.getItem(APP_NAME_KEY) || "GV OS",
            appLogo: localStorage.getItem(APP_LOGO_KEY) || "GV",
            digitalClockTz: localStorage.getItem(CLOCK_TZ_KEY) || "",
        });
        get().apply();
    },
    exportData: () => ({
        scale: get().scale,
        clocks: get().clocks,
        recents: get().recents,
        appName: get().appName,
        appLogo: get().appLogo,
        labels: get().labels,
        digitalClockTz: get().digitalClockTz,
        theme: typeof localStorage !== "undefined" ? localStorage.getItem("gv-os:theme") : null,
    }),
    importData: (d) => {
        if (typeof d?.scale === "string")
            get().setScale(d.scale);
        if (Array.isArray(d?.clocks))
            get().setClocks(d.clocks);
        if (typeof d?.appName === "string")
            get().setAppName(d.appName);
        if (typeof d?.appLogo === "string")
            get().setAppLogo(d.appLogo);
        if (d?.labels && typeof d.labels === "object")
            get().setLabels({ ...DEFAULT_LABELS, ...d.labels });
        if (typeof d?.digitalClockTz === "string")
            get().setDigitalClockTz(d.digitalClockTz);
        if (typeof d?.theme === "string" && typeof localStorage !== "undefined")
            localStorage.setItem("gv-os:theme", d.theme);
    },
}));
