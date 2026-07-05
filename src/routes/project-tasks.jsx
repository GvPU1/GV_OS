import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Pencil, Trash2, Calendar as CalIcon, FolderKanban, ChevronRight, Search, Clock, } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fmtDay, priorityChip, projectStatusChip, fmtLongDate } from "@/lib/format";
import { ProjectTaskDialog, PT_STATUS } from "@/components/project-task-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
export const Route = createFileRoute("/project-tasks")({
    head: () => ({
        meta: [
            { title: "Project Tasks — GV OS" },
            {
                name: "description",
                content: "Manage every task within each project from one centralized workspace.",
            },
        ],
    }),
    component: ProjectTasksPage,
});
const STATUS_META = {
    backlog: { label: "Backlog", chip: "bg-slate-accent/15 text-slate-accent" },
    planned: { label: "Planned", chip: "bg-medium/20 text-medium" },
    in_progress: { label: "In Progress", chip: "bg-info/15 text-info" },
    review: { label: "Review", chip: "bg-accent text-accent-foreground" },
    testing: { label: "Testing", chip: "bg-high/15 text-high" },
    done: { label: "Completed", chip: "bg-success/15 text-success" },
    blocked: { label: "Blocked", chip: "bg-critical/15 text-critical" },
    cancelled: { label: "Cancelled", chip: "bg-muted text-muted-foreground" },
};
function normStatus(s) {
    if (s in STATUS_META)
        return s;
    if (s === "todo")
        return "backlog";
    if (s === "deferred")
        return "blocked";
    return "backlog";
}
function ProjectTasksPage() {
    const projects = useLiveQuery(() => db.projects.filter((p) => !p.archived).toArray(), [], []);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [defaultProject, setDefaultProject] = useState();
    const [query, setQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [expandAll, setExpandAll] = useState(true);
    const openNew = (projectId) => {
        setEditing(null);
        setDefaultProject(projectId);
        setDialogOpen(true);
    };
    const openEdit = (t) => {
        setEditing(t);
        setDefaultProject(undefined);
        setDialogOpen(true);
    };
    return (<div className="mx-auto max-w-7xl space-y-5 p-5 md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Project Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Manage every task within each project from one centralized workspace.
          </p>
        </div>
        <Button onClick={() => openNew()} className="gap-1.5 rounded-full">
          <Plus className="h-3.5 w-3.5"/> Add Task
        </Button>
      </div>

      {/* Toolbar */}
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"/>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks…" className="h-8 pl-8 text-sm"/>
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PT_STATUS.map((s) => (<SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setExpandAll((v) => !v)}>
          {expandAll ? "Collapse all" : "Expand all"}
        </Button>
      </Card>

      {(!projects || projects.length === 0) && (<Card className="flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
            <FolderKanban className="h-5 w-5"/>
          </div>
          <h2 className="text-base font-semibold">No projects yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Create a project first to start tracking project tasks.
          </p>
          <Link to="/projects">
            <Button size="sm">Go to Projects</Button>
          </Link>
        </Card>)}

      <div className="space-y-4">
        {(projects || []).map((p) => (<ProjectSection key={p.id} project={p} forceOpen={expandAll} query={query} priorityFilter={priorityFilter} statusFilter={statusFilter} onAdd={() => openNew(p.id)} onEdit={openEdit}/>))}
      </div>

      <ProjectTaskDialog open={dialogOpen} onOpenChange={setDialogOpen} projectId={defaultProject} task={editing}/>
    </div>);
}
const SORT_OPTIONS = [
    { v: "due", l: "Due date" },
    { v: "priority", l: "Priority" },
    { v: "status", l: "Status" },
    { v: "created", l: "Date created" },
    { v: "alpha", l: "Alphabetical" },
];
const PRIO_ORDER = {
    critical: 0, high: 1, medium: 2, low: 3,
};
const STATUS_ORDER = {
    in_progress: 0, review: 1, testing: 2, planned: 3, backlog: 4,
    blocked: 5, done: 6, cancelled: 7,
};
function ProjectSection({ project, forceOpen, query, priorityFilter, statusFilter, onAdd, onEdit, }) {
    const [open, setOpen] = useState(true);
    const [sortKey, setSortKey] = useState("due");
    const expanded = forceOpen && open;
    const raw = useLiveQuery(() => db.projectTasks.where("projectId").equals(project.id).toArray(), [project.id], []);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (raw || []).filter((t) => {
            if (q && !t.title.toLowerCase().includes(q))
                return false;
            if (priorityFilter !== "all" && t.priority !== priorityFilter)
                return false;
            const st = normStatus(t.status);
            if (statusFilter !== "all" && st !== statusFilter)
                return false;
            return true;
        });
    }, [raw, query, priorityFilter, statusFilter]);
    const sorted = useMemo(() => {
        const list = filtered.slice();
        switch (sortKey) {
            case "due":
                list.sort((a, b) => (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity));
                break;
            case "priority":
                list.sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]);
                break;
            case "status":
                list.sort((a, b) => STATUS_ORDER[normStatus(a.status)] - STATUS_ORDER[normStatus(b.status)]);
                break;
            case "created":
                list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
                break;
            case "alpha":
                list.sort((a, b) => a.title.localeCompare(b.title));
                break;
        }
        return list;
    }, [filtered, sortKey]);
    const total = sorted.length;
    const doneCount = sorted.filter((t) => normStatus(t.status) === "done").length;
    const remaining = total - doneCount;
    const progress = total ? Math.round((doneCount / total) * 100) : 0;
    const nextDue = sorted
        .filter((t) => t.dueDate && normStatus(t.status) !== "done")
        .sort((a, b) => (a.dueDate - b.dueDate))[0]?.dueDate;
    return (<Card className="overflow-hidden p-0">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-4 p-4">
        <button onClick={() => setOpen((v) => !v)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={expanded ? "Collapse" : "Expand"}>
          <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-90")}/>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight">
              {project.name}
            </h2>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", projectStatusChip(project.status))}>
              {project.status.replace("_", " ")}
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", priorityChip(project.priority))}>
              {project.priority}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }}/>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {progress}%
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 font-mono text-[11px] tabular-nums">
          <Stat label="Tasks" value={String(total)}/>
          <Stat label="Done" value={String(doneCount)} tone="text-success"/>
          <Stat label="Left" value={String(remaining)} tone="text-warning"/>
          <Stat label="Next" value={nextDue ? fmtDay(nextDue) : "—"}/>
        </div>

        <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5"/> Task
        </Button>
      </div>

      {/* Expanded flat list */}
      {expanded && (<div className="border-t border-border bg-surface-2/40 p-4">
          <div className="mb-3 flex items-center justify-end gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Sort by
            </span>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v)}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (<SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {total === 0 ? (<button onClick={onAdd} className="grid w-full place-items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center transition hover:border-border-strong">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Plus className="h-5 w-5"/>
              </div>
              <p className="text-sm font-medium">No tasks created yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Create your first task to begin tracking project progress.
              </p>
            </button>) : (<div className="space-y-2">
              {sorted.map((t) => (<TaskRow key={t.id} task={t} onEdit={() => onEdit(t)}/>))}
            </div>)}
        </div>)}
    </Card>);
}
function Stat({ label, value, tone }) {
    return (<div className="text-right">
      <p className={cn("text-sm font-semibold", tone)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>);
}
function TaskRow({ task, onEdit }) {
    const st = normStatus(task.status);
    const done = st === "done";
    const overdue = task.dueDate && !done && task.dueDate < Date.now();
    const toggleDone = async () => {
        await db.projectTasks.update(task.id, {
            status: done ? "in_progress" : "done",
        });
    };
    const setStatus = async (v) => {
        await db.projectTasks.update(task.id, { status: v });
    };
    return (<div onClick={onEdit} className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
      {/* Left: checkbox + title/desc/due */}
      <input type="checkbox" checked={done} onClick={(e) => e.stopPropagation()} onChange={toggleDone} className="h-4 w-4 shrink-0 cursor-pointer accent-primary"/>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-semibold leading-snug", done && "text-muted-foreground line-through")} title={task.title}>
          {task.title}
        </p>
        {task.description && (<p className="mt-0.5 truncate text-xs text-muted-foreground">
            {task.description}
          </p>)}
        <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10.5px] tabular-nums text-muted-foreground">
          {task.dueDate && (<span className={cn("inline-flex items-center gap-1", overdue && "text-critical", done && "text-success")}>
              <CalIcon className="h-3 w-3"/> {fmtLongDate(task.dueDate)}
            </span>)}
          {(task.labels || []).slice(0, 3).map((l) => (<span key={l} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {l}
            </span>))}
        </div>
      </div>

      {/* Right: priority, status, estimate, actions */}
      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", priorityChip(task.priority))}>
          {task.priority}
        </span>
        <Select value={st} onValueChange={setStatus}>
          <SelectTrigger className={cn("h-6 gap-1 rounded-full border-0 px-2 py-0 text-[10px] font-medium", STATUS_META[st].chip)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PT_STATUS.map((s) => (<SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>))}
          </SelectContent>
        </Select>
        {task.estimateHours ? (<span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-muted-foreground">
            <Clock className="h-3 w-3"/> {task.estimateHours}h
          </span>) : null}
        <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edit">
            <Pencil className="h-3 w-3"/>
          </Button>
          <ConfirmDelete title="Delete this task?" onConfirm={() => db.projectTasks.delete(task.id)} trigger={<Button variant="ghost" size="icon" className="h-7 w-7" title="Delete">
                <Trash2 className="h-3 w-3"/>
              </Button>}/>
        </div>
      </div>
    </div>);
}
