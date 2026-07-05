import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward, Maximize2, Plus, Trash2, } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTimer, formatClock, pickQuote } from "@/lib/timer";
import { DigitalClock } from "@/components/digital-clock";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/study")({
    head: () => ({
        meta: [
            { title: "Study Center — GV OS" },
            {
                name: "description",
                content: "Pomodoro timer, digital clock and session checklist.",
            },
        ],
    }),
    component: StudyCenter,
});
function StudyCenter() {
    const t = useTimer();
    const [customF, setCustomF] = useState(45);
    const [customB, setCustomB] = useState(10);
    // Timer ticks globally in __root — no local interval needed.
    const quote = useMemo(() => pickQuote(2), []);
    return (<div className="mx-auto max-w-7xl space-y-5 p-5 md:p-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Study Center</h1>
          <p className="text-sm text-muted-foreground">
            Focus timer, clock and session checklist.
          </p>
        </div>
        <Link to="/focus">
          <Button>
            <Maximize2 className="h-3.5 w-3.5"/> Focus Mode
          </Button>
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3 lg:grid-rows-2">
        {/* Pomodoro — spans 2 cols × 2 rows */}
        <Card className="flex flex-col items-center gap-5 p-8 lg:col-span-2 lg:row-span-2">
          <Tabs value={t.mode} onValueChange={(v) => t.setMode(v)}>
            <TabsList>
              <TabsTrigger value="25_5">25 / 5</TabsTrigger>
              <TabsTrigger value="52_17">52 / 17</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
          </Tabs>

          {t.mode === "custom" && (<div className="flex items-end gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Focus (min)
                </p>
                <Input type="number" min={5} max={180} value={customF} onChange={(e) => setCustomF(+e.target.value)} className="w-24"/>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Break (min)
                </p>
                <Input type="number" min={1} max={60} value={customB} onChange={(e) => setCustomB(+e.target.value)} className="w-24"/>
              </div>
              <Button variant="outline" onClick={() => t.setCustom(customF, customB)}>
                Apply
              </Button>
            </div>)}

          <div className="my-6 text-center">
            <p className={cn("font-mono text-[120px] font-semibold leading-none tabular-nums tracking-tight md:text-[144px]", t.phase === "focus" ? "text-foreground" : "text-primary")}>
              {formatClock(t.remaining)}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {t.phase === "idle"
            ? "Ready"
            : t.phase === "focus"
                ? "Focus"
                : t.phase === "short_break"
                    ? "Short break"
                    : "Long break"}
              {t.cycle > 0 && ` · cycle ${t.cycle}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {t.running ? (<Button size="lg" variant="outline" onClick={t.pause}>
                <Pause className="h-4 w-4"/> Pause
              </Button>) : (<Button size="lg" onClick={t.start}>
                <Play className="h-4 w-4"/> {t.phase === "idle" ? "Start" : "Resume"}
              </Button>)}
            <Button size="lg" variant="ghost" onClick={t.reset}>
              <RotateCcw className="h-4 w-4"/> Reset
            </Button>
            <Button size="lg" variant="ghost" onClick={t.skip}>
              <SkipForward className="h-4 w-4"/> Skip
            </Button>
          </div>

          <p className="max-w-md text-center text-sm italic text-muted-foreground">
            "{quote}"
          </p>
        </Card>

        {/* Digital clock — top right */}
        <Card className="p-4 lg:col-start-3 lg:row-start-1">
          <DigitalClock />
        </Card>

        {/* Session checklist — bottom right */}
        <Card className="p-5 lg:col-start-3 lg:row-start-2">
          <SessionChecklist />
        </Card>
      </div>
    </div>);
}
function SessionChecklist() {
    const [items, setItems] = useState([]);
    const [adding, setAdding] = useState("");
    return (<div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Session checklist</h2>
        <Button variant="ghost" size="sm" onClick={() => setItems([])}>
          Clear
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Temporary — clears when you choose.
      </p>
      <div className="mt-3 flex gap-2">
        <Input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add an item…" className="h-8 text-sm" onKeyDown={(e) => {
            if (e.key === "Enter" && adding.trim()) {
                setItems((prev) => [
                    ...prev,
                    { id: crypto.randomUUID(), text: adding.trim(), done: false },
                ]);
                setAdding("");
            }
        }}/>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
            if (!adding.trim())
                return;
            setItems((p) => [
                ...p,
                { id: crypto.randomUUID(), text: adding.trim(), done: false },
            ]);
            setAdding("");
        }}>
          <Plus className="h-3.5 w-3.5"/>
        </Button>
      </div>
      <ul className="mt-3 flex-1 space-y-1.5 overflow-y-auto">
        {items.map((i) => (<li key={i.id} className="group flex items-center gap-2">
            <input type="checkbox" checked={i.done} onChange={() => setItems((prev) => prev.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)))}/>
            <span className={cn("flex-1 text-sm", i.done && "text-muted-foreground line-through")}>
              {i.text}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => setItems((p) => p.filter((x) => x.id !== i.id))}>
              <Trash2 className="h-3 w-3"/>
            </Button>
          </li>))}
        {items.length === 0 && (<li className="text-xs text-muted-foreground">No items.</li>)}
      </ul>
    </div>);
}
