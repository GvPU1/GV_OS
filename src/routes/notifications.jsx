import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Bell, Calendar, CheckSquare, BookOpen, FolderKanban, Award, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { fmtLongDate, fmtRelative, priorityChip } from "@/lib/format";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/notifications")({
    head: () => ({
        meta: [
            { title: "Notifications — GV OS" },
            {
                name: "description",
                content: "Upcoming deadlines and reminders across GV OS.",
            },
        ],
    }),
    component: NotificationCenter,
});
function NotificationCenter() {
    const [filter, setFilter] = useState("week");
    const tasks = useLiveQuery(() => db.tasks.filter((t) => !t.archived).toArray(), [], []);
    const assignments = useLiveQuery(() => db.assignments.filter((a) => !a.archived).toArray(), [], []);
    const projects = useLiveQuery(() => db.projects.filter((p) => !p.archived).toArray(), [], []);
    const projectTasks = useLiveQuery(() => db.projectTasks.toArray(), [], []);
    const events = useLiveQuery(() => db.events.filter((e) => !e.archived).toArray(), [], []);
    const certs = useLiveQuery(() => db.certifications.filter((c) => !c.archived).toArray(), [], []);
    const items = useMemo(() => {
        const list = [];
        (tasks || []).forEach((t) => {
            if (t.dueDate && t.status !== "done")
                list.push({ id: `t${t.id}`, title: t.title, source: "Task", icon: CheckSquare, at: t.dueDate, priority: t.priority });
        });
        (assignments || []).forEach((a) => {
            if (a.deadline && a.status !== "completed" && a.status !== "submitted")
                list.push({ id: `a${a.id}`, title: a.title, source: "Assignment", icon: BookOpen, at: a.deadline, priority: a.priority });
        });
        (projects || []).forEach((p) => {
            if (p.deadline && p.status !== "completed" && p.status !== "cancelled")
                list.push({ id: `p${p.id}`, title: p.name, source: "Project", icon: FolderKanban, at: p.deadline, priority: p.priority });
        });
        (projectTasks || []).forEach((pt) => {
            if (pt.dueDate && pt.status !== "done")
                list.push({ id: `pt${pt.id}`, title: pt.title, source: "Project task", icon: ListChecks, at: pt.dueDate, priority: pt.priority });
        });
        (events || []).forEach((e) => {
            list.push({ id: `e${e.id}`, title: e.title, source: e.kind === "academic" ? "Academic event" : "Event", icon: Calendar, at: e.start });
        });
        (certs || []).forEach((c) => {
            if (c.status !== "completed" && c.status !== "expired")
                list.push({ id: `c${c.id}`, title: c.name, source: "Certification", icon: Award, at: Date.now() + 30 * 86400000 });
        });
        return list.sort((a, b) => a.at - b.at);
    }, [tasks, assignments, projects, projectTasks, events, certs]);
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const weekAhead = now + 7 * 86400000;
    const filtered = items.filter((n) => {
        if (filter === "overdue")
            return n.at < now;
        if (filter === "today")
            return n.at >= startOfDay.getTime() && n.at <= endOfDay.getTime();
        if (filter === "week")
            return n.at >= startOfDay.getTime() && n.at <= weekAhead;
        return true;
    });
    return (<div className="mx-auto max-w-4xl space-y-5 p-5 md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Upcoming deadlines and reminders across GV OS.
          </p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Bell className="h-4 w-4"/>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["today", "week", "overdue", "all"].map((f) => (<Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="h-8 capitalize">
            {f === "week" ? "This week" : f}
          </Button>))}
      </div>

      {filtered.length === 0 ? (<Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Nothing here. You're all caught up.</p>
        </Card>) : (<div className="grid gap-2.5">
          {filtered.map((n) => {
                const Icon = n.icon;
                const overdue = n.at < now;
                return (<Card key={n.id} className="flex items-center gap-3 p-3.5 transition hover:border-border-strong">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-4 w-4"/>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {n.source} · {fmtLongDate(n.at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {n.priority && (<span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", priorityChip(n.priority))}>
                      {n.priority}
                    </span>)}
                  <span className={cn("font-mono text-[11px]", overdue ? "text-critical" : "text-muted-foreground")}>
                    {fmtRelative(n.at)}
                  </span>
                </div>
              </Card>);
            })}
        </div>)}
    </div>);
}
