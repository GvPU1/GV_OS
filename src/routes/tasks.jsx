import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Pencil, Trash2, Archive } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fmtLongDate, priorityChip, taskStatusChip } from "@/lib/format";
import { TaskDialog } from "@/components/task-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useSettings } from "@/lib/settings-store";
import { toast } from "sonner";
export const Route = createFileRoute("/tasks")({
    head: () => ({
        meta: [
            { title: "Tasks — GV OS" },
            { name: "description", content: "B.Tech, IITM BS and Personal tasks." },
        ],
    }),
    component: TasksPage,
});
function useColumns() {
    const labels = useSettings((s) => s.labels);
    return [
        { key: "btech", label: labels.btech, accent: "info" },
        { key: "bs", label: labels.bs, accent: "success" },
        { key: "personal", label: "Personal", accent: "warning" },
    ];
}
const STATUS_LABEL = {
    todo: "Not started",
    in_progress: "In progress",
    done: "Completed",
    deferred: "Deferred",
};
function TasksPage() {
    const columns = useColumns();
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [defaultProgram, setDefaultProgram] = useState();
    const tasks = useLiveQuery(() => db.tasks.filter((t) => !t.archived).toArray(), [], []);
    const grouped = useMemo(() => {
        const g = { btech: [], bs: [], personal: [] };
        (tasks || []).forEach((t) => {
            if (priorityFilter !== "all" && t.priority !== priorityFilter)
                return;
            if (statusFilter !== "all" && t.status !== statusFilter)
                return;
            g[t.program].push(t);
        });
        const prio = { critical: 0, high: 1, medium: 2, low: 3 };
        for (const k of Object.keys(g)) {
            g[k].sort((a, b) => prio[a.priority] - prio[b.priority]);
        }
        return g;
    }, [tasks, priorityFilter, statusFilter]);
    const openNew = (program) => {
        setEditing(null);
        setDefaultProgram(program);
        setDialogOpen(true);
    };
    const openEdit = (t) => {
        setEditing(t);
        setDefaultProgram(undefined);
        setDialogOpen(true);
    };
    return (<div className="mx-auto max-w-7xl space-y-7 p-6 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Card-based task boards across your programs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect label="Priority" value={priorityFilter} onChange={(v) => setPriorityFilter(v)} options={[
            { v: "all", l: "All" },
            { v: "critical", l: "Critical" },
            { v: "high", l: "High" },
            { v: "medium", l: "Medium" },
            { v: "low", l: "Low" },
        ]}/>
          <FilterSelect label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v)} options={[
            { v: "all", l: "All" },
            { v: "todo", l: "Not started" },
            { v: "in_progress", l: "In progress" },
            { v: "done", l: "Completed" },
            { v: "deferred", l: "Deferred" },
        ]}/>
          <Button size="sm" onClick={() => openNew()} className="gap-1.5">
            <Plus className="h-3.5 w-3.5"/> New task
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {columns.map((c) => (<ColumnSection key={c.key} program={c.key} title={c.label} accent={c.accent} tasks={grouped[c.key]} onAdd={() => openNew(c.key)} onEdit={openEdit}/>))}
      </div>

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultProgram={defaultProgram} task={editing}/>
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
function ColumnSection({ title, accent, tasks, onAdd, onEdit, }) {
    const ringClass = accent === "info"
        ? "border-info/40"
        : accent === "success"
            ? "border-success/40"
            : "border-warning/40";
    const dotClass = accent === "info"
        ? "bg-info"
        : accent === "success"
            ? "bg-success"
            : "bg-warning";
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "done").length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return (<section className={cn("space-y-4 rounded-2xl border-2 bg-surface/30 p-5", ringClass)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={cn("h-2 w-2 rounded-full", dotClass)}/>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={onAdd} className="h-7 gap-1 text-xs">
          <Plus className="h-3 w-3"/> Add
        </Button>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between font-mono text-[10.5px] text-muted-foreground">
          <span>{completed} / {total} Completed</span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} className="h-1.5"/>
      </div>
      <div className="space-y-3">
        {tasks.length === 0 ? (<Card onClick={onAdd} className="cursor-pointer p-6 text-center text-xs text-muted-foreground transition hover:border-border-strong">
            No tasks yet. Click to add.
          </Card>) : (tasks.map((t) => <TaskCard key={t.id} task={t} onEdit={() => onEdit(t)}/>))}
      </div>
    </section>);
}
function TaskCard({ task, onEdit, }) {
    const done = task.status === "done";
    return (<Card className={cn("group relative overflow-hidden p-4 transition hover:border-border-strong hover:shadow-sm")}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn("min-w-0 flex-1 text-sm font-semibold leading-snug", done && "text-muted-foreground line-through")}>
          {task.title}
        </p>
        <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edit">
            <Pencil className="h-3 w-3"/>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Archive" onClick={async () => {
            await db.tasks.update(task.id, { archived: true, updatedAt: Date.now() });
            toast.success("Archived", { duration: 1000 });
        }}>
            <Archive className="h-3 w-3"/>
          </Button>
          <ConfirmDelete title="Delete this task?" description="This task will be permanently removed." onConfirm={() => db.tasks.delete(task.id)} trigger={<Button variant="ghost" size="icon" className="h-7 w-7" title="Delete">
                <Trash2 className="h-3 w-3"/>
              </Button>}/>
        </div>
      </div>

      {task.dueDate && (<p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {fmtLongDate(task.dueDate)}
        </p>)}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className={cn("rounded-full px-2 py-0.5 font-medium", taskStatusChip(task.status))}>
          {STATUS_LABEL[task.status]}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 font-medium capitalize", priorityChip(task.priority))}>
          {task.priority}
        </span>
      </div>

      <div className="mt-3 border-t border-border/60 pt-2">
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-[11px] font-medium text-info underline-offset-2 hover:underline">
              Update Status
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" align="start">
            {Object.keys(STATUS_LABEL).map((s) => (<button key={s} onClick={() => db.tasks.update(task.id, { status: s, updatedAt: Date.now() })} className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-accent", task.status === s && "bg-accent text-accent-foreground")}>
                {STATUS_LABEL[s]}
                {task.status === s && <span className="text-[10px]">●</span>}
              </button>))}
          </PopoverContent>
        </Popover>
      </div>
    </Card>);
}
function priorityAccentBefore(p) {
    switch (p) {
        case "critical": return "before:bg-critical";
        case "high": return "before:bg-high";
        case "medium": return "before:bg-medium";
        case "low": return "before:bg-success";
        default: return "before:bg-muted";
    }
}
