import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Calendar as CalendarIcon, CheckCircle2, Flame, GraduationCap, Timer, TrendingUp, } from "lucide-react";
import { endOfDay, startOfDay, startOfMonth, endOfMonth, startOfToday, addDays, format, isSameDay, eachDayOfInterval, isSameMonth, startOfWeek, endOfWeek, } from "date-fns";
import { db } from "@/lib/db";
import { fmtDay, fmtTime, priorityTone } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/")({
    head: () => ({
        meta: [
            { title: "Dashboard — GV OS" },
            {
                name: "description",
                content: "Your command center. Today's schedule, upcoming deadlines, calendar, study stats, projects and quick capture.",
            },
        ],
    }),
    component: Dashboard,
});
function useUnified(from, to) {
    const tasks = useLiveQuery(() => db.tasks.where("dueDate").between(from, to, true, true).toArray(), [from, to], []);
    const assigns = useLiveQuery(() => db.assignments.where("deadline").between(from, to, true, true).toArray(), [from, to], []);
    const events = useLiveQuery(() => db.events.where("start").between(from, to, true, true).toArray(), [from, to], []);
    const pTasks = useLiveQuery(() => db.projectTasks.where("dueDate").between(from, to, true, true).toArray(), [from, to], []);
    return useMemo(() => {
        const out = [];
        (tasks || []).forEach((t) => out.push({
            id: `t-${t.id}`,
            source: "task",
            title: t.title,
            at: t.dueDate,
            priority: t.priority,
            status: t.status,
            refId: t.id,
        }));
        (assigns || []).forEach((a) => out.push({
            id: `a-${a.id}`,
            source: "assignment",
            title: a.title,
            at: a.deadline,
            priority: a.priority,
            status: a.status,
            refId: a.id,
        }));
        (events || []).forEach((e) => out.push({
            id: `e-${e.id}`,
            source: "event",
            title: e.title,
            at: e.start,
            refId: e.id,
        }));
        (pTasks || []).forEach((p) => out.push({
            id: `pt-${p.id}`,
            source: "project_task",
            title: p.title,
            at: p.dueDate,
            priority: p.priority,
            status: p.status,
            refId: p.id,
        }));
        return out.sort((a, b) => a.at - b.at);
    }, [tasks, assigns, events, pTasks]);
}
function Dashboard() {
    const today = startOfToday();
    const [selected, setSelected] = useState(today);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const monthStart = startOfMonth(selected);
    const monthEnd = endOfMonth(selected);
    const monthItems = useUnified(monthStart.getTime(), monthEnd.getTime());
    const todayItems = useUnified(startOfDay(today).getTime(), endOfDay(today).getTime());
    const selectedItems = useUnified(startOfDay(selected).getTime(), endOfDay(selected).getTime());
    const upcoming = useUnified(startOfDay(today).getTime(), endOfDay(addDays(today, 14)).getTime()).slice(0, 6);
    const projects = useLiveQuery(() => db.projects
        .filter((p) => !p.archived && p.status !== "completed")
        .toArray(), [], []);
    return (<div className="mx-auto max-w-7xl space-y-5 p-5 md:p-7">
      {/* Hero */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground" suppressHydrationWarning>
            {mounted ? format(today, "EEEE, MMMM d") : "—"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Good {greeting(mounted)}. Here's your day.
          </h1>
        </div>
        <div className="flex gap-2">
          <Link to="/study">
            <Button size="sm">
              <Timer className="h-3.5 w-3.5"/> Start focus
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={CalendarIcon} label="Today" value={String(todayItems.length)} sub="scheduled items"/>
        <StatTile icon={Flame} label="Upcoming" value={String(upcoming.length)} sub="next 14 days"/>
        <StatTile icon={CheckCircle2} label="Selected day" value={String(selectedItems.length)} sub={isSameDay(selected, today) ? "today" : format(selected, "MMM d")}/>
        <StatTile icon={TrendingUp} label="Active projects" value={String((projects || []).length)} sub="in progress"/>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Today + selected day */}
        <Card className="overflow-hidden p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                {isSameDay(selected, today)
            ? "Today's schedule"
            : `${fmtDay(selected.getTime())}'s schedule`}
              </h2>
              <p className="text-xs text-muted-foreground">
                Events, tasks, assignments & project tasks
              </p>
            </div>
            <Link to="/calendar" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              Open calendar <ArrowRight className="h-3 w-3"/>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {selectedItems.length === 0 ? (<EmptyRow label="Nothing scheduled." hint="Use ⌘N to capture something."/>) : (selectedItems.map((i) => <ItemRow key={i.id} i={i}/>))}
          </div>
        </Card>

        {/* Mini calendar */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">
              {format(selected, "MMMM yyyy")}
            </h2>
          </div>
          <MiniCalendar month={selected} selected={selected} onSelect={setSelected} items={monthItems}/>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Upcoming deadlines */}
        <Card className="overflow-hidden p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold tracking-tight">
              Upcoming deadlines
            </h2>
            <Link to="/assignments" className="text-xs text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {upcoming.length === 0 ? (<EmptyRow label="No upcoming deadlines."/>) : (upcoming.map((i) => <ItemRow key={i.id} i={i} showDay/>))}
          </div>
        </Card>

        {/* Active projects */}
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold tracking-tight">
              Active projects
            </h2>
            <Link to="/projects" className="text-xs text-muted-foreground hover:text-foreground">
              All
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(projects || []).length === 0 ? (<EmptyRow label="No active projects."/>) : ((projects || []).slice(0, 5).map((p) => (<div key={p.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.progress}%
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${p.progress}%` }}/>
                  </div>
                </div>)))}
          </div>
        </Card>
      </div>
    </div>);
}
function greeting(mounted) {
    if (!mounted)
        return "day";
    const h = new Date().getHours();
    if (h < 5)
        return "night";
    if (h < 12)
        return "morning";
    if (h < 18)
        return "afternoon";
    return "evening";
}
function StatTile({ icon: Icon, label, value, sub, }) {
    return (<Card className="flex items-center gap-3 p-4">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="h-4 w-4"/>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-base font-semibold">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
    </Card>);
}
function ItemRow({ i, showDay }) {
    const Icon = i.source === "task"
        ? CheckCircle2
        : i.source === "assignment"
            ? GraduationCap
            : i.source === "project_task"
                ? CheckCircle2
                : CalendarIcon;
    const done = i.status === "done" || i.status === "completed" || i.status === "submitted";
    return (<div className="flex items-center gap-3 px-5 py-2.5">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", done ? "text-success" : priorityTone(i.priority))}/>
      <span className={cn("min-w-0 flex-1 truncate text-sm", done && "text-muted-foreground line-through")}>
        {i.title}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">
        {showDay ? fmtDay(i.at) + " · " : ""}
        {fmtTime(i.at)}
      </span>
      <span className="hidden rounded-md bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
        {i.source.replace("_", " ")}
      </span>
    </div>);
}
function EmptyRow({ label, hint }) {
    return (<div className="px-5 py-8 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p>}
    </div>);
}
function MiniCalendar({ month, selected, onSelect, items, }) {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const today = startOfToday();
    const byDay = useMemo(() => {
        const m = new Map();
        items.forEach((i) => {
            const k = format(new Date(i.at), "yyyy-MM-dd");
            m.set(k, (m.get(k) || 0) + 1);
        });
        return m;
    }, [items]);
    return (<div>
      <div className="mb-1.5 grid grid-cols-7 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (<div key={i}>{d}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d) => {
            const isCur = isSameMonth(d, month);
            const isSel = isSameDay(d, selected);
            const isToday = isSameDay(d, today);
            const count = byDay.get(format(d, "yyyy-MM-dd")) || 0;
            return (<button key={d.toISOString()} onClick={() => onSelect(d)} className={cn("relative aspect-square rounded-md text-[11px] font-medium transition-colors", isSel
                    ? "bg-primary text-primary-foreground"
                    : isToday
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted", !isCur && !isSel && "text-muted-foreground/40")}>
              {d.getDate()}
              {count > 0 && (<span className={cn("absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full", isSel ? "bg-primary-foreground" : "bg-primary")}/>)}
            </button>);
        })}
      </div>
    </div>);
}
