import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays, addMonths, endOfDay, endOfWeek, format, isSameDay, isToday, startOfDay, startOfWeek, subMonths, } from "date-fns";
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Clock, FileText, } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { fmtDay, fmtTime, priorityChip } from "@/lib/format";
import { EventDialog } from "@/components/event-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
export const Route = createFileRoute("/calendar")({
    head: () => ({
        meta: [
            { title: "Calendar — GV OS" },
            {
                name: "description",
                content: "Unified calendar with event cards and upcoming deadlines across tasks, assignments and projects.",
            },
        ],
    }),
    component: CalendarPage,
});
const SOURCE_ROUTE = {
    task: "/tasks",
    assignment: "/assignments",
    project_task: "/project-tasks",
};
function CalendarPage() {
    const navigate = useNavigate();
    const [selected, setSelected] = useState(startOfDay(new Date()));
    const [month, setMonth] = useState(startOfDay(new Date()));
    const [eventDialogOpen, setEventDialogOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [deadlinesOpen, setDeadlinesOpen] = useState(true);
    const [sourceFilter, setSourceFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");
    // Range covers the whole visible month grid plus next 30 days for deadlines.
    const rangeFrom = startOfDay(subMonths(month, 1)).getTime();
    const rangeTo = endOfDay(addDays(month, 60)).getTime();
    const items = useUnifiedRange(rangeFrom, rangeTo);
    const filtered = useMemo(() => {
        return items.filter((i) => {
            if (sourceFilter !== "all" && i.source !== sourceFilter)
                return false;
            if (priorityFilter !== "all" && i.priority !== priorityFilter)
                return false;
            const done = i.status === "done" || i.status === "completed" || i.status === "submitted";
            if (statusFilter === "open" && done)
                return false;
            if (statusFilter === "done" && !done)
                return false;
            return true;
        });
    }, [items, sourceFilter, statusFilter, priorityFilter]);
    const itemsByDay = useMemo(() => {
        const m = new Map();
        filtered.forEach((i) => {
            const k = format(new Date(i.at), "yyyy-MM-dd");
            const arr = m.get(k) || [];
            arr.push(i);
            m.set(k, arr);
        });
        return m;
    }, [filtered]);
    // Deadlines (tasks + assignments + project_tasks)
    const now = Date.now();
    const todayStart = startOfDay(new Date()).getTime();
    const todayEnd = endOfDay(new Date()).getTime();
    const weekEnd = endOfDay(addDays(new Date(), 7)).getTime();
    const deadlineItems = filtered.filter((i) => i.source !== "event");
    const overdue = deadlineItems.filter((i) => i.at < todayStart &&
        i.status !== "done" &&
        i.status !== "completed" &&
        i.status !== "submitted");
    const dueToday = deadlineItems.filter((i) => i.at >= todayStart && i.at <= todayEnd);
    const dueThisWeek = deadlineItems.filter((i) => i.at > todayEnd && i.at <= weekEnd);
    void now;
    const goToDeadline = (i) => {
        setSelected(new Date(i.at));
        navigate({ to: SOURCE_ROUTE[i.source] ?? "/tasks" });
    };
    const selectedEvents = useLiveQuery(() => db.events
        .where("start")
        .between(startOfDay(selected).getTime(), endOfDay(selected).getTime(), true, true)
        .filter((e) => !e.archived)
        .toArray(), [selected.getTime()], []);
    return (<div className="mx-auto max-w-7xl space-y-5 p-5 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            {format(selected, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect label="Type" value={sourceFilter} onChange={(v) => setSourceFilter(v)} options={[
            { v: "all", l: "All" },
            { v: "event", l: "Events" },
            { v: "assignment", l: "Assignments" },
            { v: "task", l: "Tasks" },
            { v: "project_task", l: "Project tasks" },
        ]}/>
          <FilterSelect label="Priority" value={priorityFilter} onChange={(v) => setPriorityFilter(v)} options={[
            { v: "all", l: "All" },
            { v: "critical", l: "Critical" },
            { v: "high", l: "High" },
            { v: "medium", l: "Medium" },
            { v: "low", l: "Low" },
        ]}/>
          <FilterSelect label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v)} options={[
            { v: "all", l: "All" },
            { v: "open", l: "Open" },
            { v: "done", l: "Done" },
        ]}/>
          <Button size="sm" onClick={() => {
            setEditingEvent(null);
            setEventDialogOpen(true);
        }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5"/> Add event
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => setMonth(subMonths(month, 1))}>
              <ChevronLeft className="h-5 w-5"/>
            </Button>
            <h2 className="text-lg font-semibold tracking-tight">
              {format(month, "MMMM yyyy")}
            </h2>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight className="h-5 w-5"/>
            </Button>
          </div>
          <Calendar mode="single" month={month} onMonthChange={setMonth} selected={selected} onSelect={(d) => d && setSelected(d)} className={cn("pointer-events-auto mx-auto w-full [--cell-size:3.25rem] [&_table]:w-full")} classNames={{
            months: "relative flex w-full flex-col gap-4",
            month: "flex w-full flex-col gap-2",
            month_caption: "hidden",
            nav: "hidden",
            weekdays: "flex w-full",
            weekday: "text-muted-foreground flex-1 select-none rounded-md text-[11px] font-semibold uppercase tracking-wider py-2",
            week: "mt-1 flex w-full",
            day: "group/day relative flex-1 aspect-square select-none p-0 text-center",
        }} modifiers={{
            hasEvents: (d) => (itemsByDay.get(format(d, "yyyy-MM-dd")) || []).some((i) => i.source === "event"),
            hasDeadlines: (d) => (itemsByDay.get(format(d, "yyyy-MM-dd")) || []).some((i) => i.source !== "event"),
            isToday,
        }} modifiersClassNames={{
            hasEvents: "after:absolute after:bottom-1.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary relative",
            hasDeadlines: "before:absolute before:bottom-1.5 before:left-[40%] before:h-1.5 before:w-1.5 before:rounded-full before:bg-warning relative",
        }}/>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <Legend color="bg-primary" label="Events"/>
            <Legend color="bg-warning" label="Deadlines"/>
            <Legend color="bg-success" label="Completed"/>
            <Legend color="bg-accent" label="Today"/>
          </div>
        </Card>

        <EventsPanel selected={selected} events={selectedEvents || []} onAdd={() => {
            setEditingEvent(null);
            setEventDialogOpen(true);
        }} onEdit={(e) => {
            setEditingEvent(e);
            setEventDialogOpen(true);
        }}/>
      </div>

      {/* Upcoming deadlines */}
      <section>
        <button onClick={() => setDeadlinesOpen((o) => !o)} className="flex w-full items-center justify-between rounded-xl border border-border bg-surface/40 px-4 py-3 text-left transition hover:bg-surface">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Upcoming deadlines
            </p>
            <p className="text-sm font-medium">
              {overdue.length} overdue · {dueToday.length} today · {dueThisWeek.length}{" "}
              this week
            </p>
          </div>
          {deadlinesOpen ? (<ChevronUp className="h-4 w-4 text-muted-foreground"/>) : (<ChevronDown className="h-4 w-4 text-muted-foreground"/>)}
        </button>
        {deadlinesOpen && (<div className="mt-3 grid gap-3 md:grid-cols-3">
            <DeadlineColumn title="Overdue" tone="critical" items={overdue} onPick={goToDeadline}/>
            <DeadlineColumn title="Due today" tone="warning" items={dueToday} onPick={goToDeadline}/>
            <DeadlineColumn title="Due this week" tone="primary" items={dueThisWeek} onPick={goToDeadline}/>
          </div>)}
      </section>

      <EventDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} defaultDate={selected} event={editingEvent}/>
    </div>);
}
function FilterSelect({ label, value, onChange, options, }) {
    return (<div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (<SelectItem key={o.v} value={o.v}>
              {o.l}
            </SelectItem>))}
        </SelectContent>
      </Select>
    </div>);
}
function Legend({ color, label }) {
    return (<span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", color)}/>
      {label}
    </span>);
}
function EventsPanel({ selected, events, onAdd, onEdit, }) {
    const sorted = [...events].sort((a, b) => a.start - b.start);
    return (<Card className="flex flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Events
          </p>
          <p className="text-sm font-medium">{format(selected, "EEEE, MMM d")}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5"/> New
        </Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {sorted.length === 0 ? (<button onClick={onAdd} className="block w-full rounded-xl border border-dashed border-border px-4 py-10 text-center text-xs text-muted-foreground hover:bg-accent/30">
            No events on this date.
            <br />
            Click to add one.
          </button>) : (sorted.map((e) => <EventCard key={e.id} event={e} onEdit={() => onEdit(e)}/>))}
      </div>
    </Card>);
}
function EventCard({ event, onEdit, }) {
    return (<Card className={cn("group relative p-3 transition hover:border-border-strong")}>
      <div className="flex items-start justify-between gap-2">
        <button onClick={onEdit} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium">{event.title}</p>
          <p className="mt-0.5 inline-flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3"/> {fmtTime(event.start)}
            <span>·</span>
            <CalIcon className="h-3 w-3"/> {fmtDay(event.start)}
          </p>
        </button>
        <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3 w-3"/>
          </Button>
          <ConfirmDelete title="Delete this event?" onConfirm={() => db.events.delete(event.id)} trigger={<Button variant="ghost" size="icon" className="h-7 w-7">
                <Trash2 className="h-3 w-3"/>
              </Button>}/>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider", event.kind === "academic"
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground")}>
          {event.kind}
        </span>
      </div>
      {event.notes && (<p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
          <FileText className="mr-1 inline h-3 w-3"/>
          {event.notes}
        </p>)}
    </Card>);
}
function DeadlineColumn({ title, tone, items, onPick, }) {
    const toneCls = tone === "critical"
        ? "text-critical"
        : tone === "warning"
            ? "text-warning"
            : "text-primary";
    return (<Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className={cn("text-xs font-semibold uppercase tracking-wider", toneCls)}>
          {title}
        </h3>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="space-y-2 p-3">
        {items.length === 0 ? (<p className="px-1 py-6 text-center text-xs text-muted-foreground">
            Nothing here.
          </p>) : (items.slice(0, 8).map((i) => (<button key={i.id} onClick={() => onPick(i)} className="block w-full rounded-lg border border-border p-2.5 text-left transition hover:border-border-strong hover:bg-accent/30">
              <p className="truncate text-sm font-medium">{i.title}</p>
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className={cn("rounded-full px-2 py-0.5 capitalize", priorityChip(i.priority))}>
                  {i.source.replace("_", " ")}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {fmtDay(i.at)} · {fmtTime(i.at)}
                </span>
              </div>
            </button>)))}
      </div>
    </Card>);
}
function useUnifiedRange(from, to) {
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
// silence unused lint
void isSameDay;
void startOfWeek;
