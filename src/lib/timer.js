import { create } from "zustand";
function durationsFor(mode, focus, brk) {
    if (mode === "25_5")
        return { focus: 25, short: 5, long: 15, every: 4 };
    if (mode === "52_17")
        return { focus: 52, short: 17, long: 17, every: 1 };
    return { focus, short: brk, long: brk, every: 4 };
}
export const useTimer = create((set, get) => ({
    mode: "25_5",
    phase: "idle",
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    cycle: 0,
    remaining: 25 * 60,
    running: false,
    startedAt: null,
    setMode: (m) => {
        const d = durationsFor(m, get().focusMinutes, get().shortBreakMinutes);
        set({
            mode: m,
            focusMinutes: d.focus,
            shortBreakMinutes: d.short,
            longBreakMinutes: d.long,
            longBreakEvery: d.every,
            phase: "idle",
            remaining: d.focus * 60,
            running: false,
            startedAt: null,
            cycle: 0,
        });
    },
    setCustom: (focus, brk) => {
        set({
            mode: "custom",
            focusMinutes: focus,
            shortBreakMinutes: brk,
            longBreakMinutes: brk,
            phase: "idle",
            remaining: focus * 60,
            running: false,
            startedAt: null,
        });
    },
    start: () => {
        const s = get();
        set({
            running: true,
            phase: s.phase === "idle" ? "focus" : s.phase,
            startedAt: s.startedAt ?? Date.now(),
        });
        playChime("start");
    },
    pause: () => set({ running: false }),
    reset: () => set({
        running: false,
        phase: "idle",
        remaining: get().focusMinutes * 60,
        startedAt: null,
        cycle: 0,
    }),
    skip: () => {
        const s = get();
        advance(s, set);
    },
    tick: () => {
        const s = get();
        if (!s.running)
            return;
        if (s.remaining <= 1) {
            advance(s, set);
        }
        else {
            set({ remaining: s.remaining - 1 });
        }
    },
}));
function advance(s, set) {
    playChime("end");
    if (s.phase === "focus") {
        const nextCycle = s.cycle + 1;
        const useLong = nextCycle % s.longBreakEvery === 0;
        set({
            cycle: nextCycle,
            phase: useLong ? "long_break" : "short_break",
            remaining: (useLong ? s.longBreakMinutes : s.shortBreakMinutes) * 60,
            startedAt: Date.now(),
        });
    }
    else {
        set({
            phase: "focus",
            remaining: s.focusMinutes * 60,
            startedAt: Date.now(),
        });
    }
}
let actx = null;
function playChime(kind) {
    if (typeof window === "undefined")
        return;
    try {
        actx =
            actx ||
                new (window.AudioContext ||
                    window
                        .webkitAudioContext)();
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.connect(g);
        g.connect(actx.destination);
        o.type = "sine";
        o.frequency.value = kind === "end" ? 660 : 880;
        g.gain.setValueAtTime(0.0001, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.18, actx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.6);
        o.start();
        o.stop(actx.currentTime + 0.65);
    }
    catch {
        /* noop */
    }
}
export function formatClock(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
const QUOTES = [
    "Discipline is the bridge between goals and accomplishment. — Jim Rohn",
    "What we do every day matters more than what we do once in a while.",
    "Slow is smooth. Smooth is fast.",
    "Deep work is a superpower in the 21st century. — Cal Newport",
    "The secret of getting ahead is getting started. — Mark Twain",
    "You don't rise to the level of your goals. You fall to the level of your systems.",
    "Concentrate all your thoughts upon the work at hand.",
];
// Deterministic stable index (no Date.now/Math.random) so SSR === client.
export function pickQuote(seed = 0) {
    return QUOTES[((seed % QUOTES.length) + QUOTES.length) % QUOTES.length];
}
