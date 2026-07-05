import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { useTimer, formatClock } from "@/lib/timer";
const LOCAL_TZ = (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
    "UTC";
export const Route = createFileRoute("/focus")({
    head: () => ({
        meta: [
            { title: "Focus — GV OS" },
            {
                name: "description",
                content: "Distraction-free full-screen Pomodoro focus mode.",
            },
        ],
    }),
    component: FocusMode,
});
function FocusMode() {
    const t = useTimer();
    const nav = useNavigate();
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);
    useEffect(() => {
        const el = document.documentElement;
        el.requestFullscreen?.().catch(() => { });
        return () => {
            if (document.fullscreenElement)
                document.exitFullscreen?.().catch(() => { });
        };
    }, []);
    const exit = () => {
        if (document.fullscreenElement)
            document.exitFullscreen?.().catch(() => { });
        nav({ to: "/study" });
    };
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape")
                exit();
            if (e.key === " ") {
                e.preventDefault();
                t.running ? t.pause() : t.start();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [t.running]);
    return (<div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <button onClick={exit} className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
        <X className="h-3.5 w-3.5"/> Exit Focus
      </button>

      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
          {t.phase === "idle"
            ? "Ready"
            : t.phase === "focus"
                ? "Focus"
                : t.phase === "short_break"
                    ? "Short break"
                    : "Long break"}
        </p>
        <p className="font-mono text-[clamp(120px,22vw,280px)] font-semibold leading-none tabular-nums tracking-tighter">
          {formatClock(t.remaining)}
        </p>
        <div className="flex items-center gap-3">
          {t.running ? (<button onClick={t.pause} className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm hover:bg-accent">
              <Pause className="h-4 w-4"/> Pause
            </button>) : (<button onClick={t.start} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Play className="h-4 w-4"/> {t.phase === "idle" ? "Start" : "Resume"}
            </button>)}
          <button onClick={t.reset} className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm hover:bg-accent">
            <RotateCcw className="h-4 w-4"/> Reset
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 pb-8 text-sm text-muted-foreground">
        <span className="font-mono tabular-nums" suppressHydrationWarning>
          {new Date(now).toLocaleTimeString([], { hour12: false })}
        </span>
        <span>·</span>
        <span>{LOCAL_TZ}</span>
      </div>
    </div>);
}
