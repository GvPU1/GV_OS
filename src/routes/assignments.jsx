import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Pencil, Trash2, Calendar as CalIcon, Archive } from "lucide-react";
import { useMemo, useState } from "react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { fmtLongDate, assignmentStatusChip, priorityChip, deadlineTone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AssignmentDialog } from "@/components/assignment-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useSettings } from "@/lib/settings-store";
import { toast } from "sonner";
export const Route = createFileRoute("/assignments")({
    head: () => ({
        meta: [
            { title: "Assignments — GV OS" },
            { name: "description", content: "B.Tech and IITM BS assignments." },
        ],
    }),
    component: AssignmentsPage,
});
const STATUS_LABEL = {
    not_started: "Not started",
    in_progress: "In progress",
    submitted: "Submitted",
    completed: "Completed",
};
const PRIO_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER = {
    not_started: 0,
    in_progress: 1,
    submitted: 2,
    completed: 3,
};
function sortAssignments(list, by) {
    const copy = list.slice();
    if (by === "deadline") {
        copy.sort((a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity));
    }
    else if (by === "priority") {
        copy.sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]);
    }
    else {
        copy.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    }
    return copy;
}
function AssignmentsPage() {
    const labels = useSettings((s) => s.labels);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [defaultProgram, setDefaultProgram] = useState();
    const [sortBTech, setSortBTech] = useState("deadline");
    const [sortBS, setSortBS] = useState("deadline");
    const assignments = useLiveQuery(() => db.assignments.filter((a) => !a.archived).toArray(), [], []);
    const courses = useLiveQuery(() => db.courses.toArray(), [], []);
    const btech = useMemo(() => sortAssignments((assignments || []).filter((a) => a.program === "btech"), sortBTech), [assignments, sortBTech]);
    const bs = useMemo(() => sortAssignments((assignments || []).filter((a) => a.program === "bs"), sortBS), [assignments, sortBS]);
    const openNew = (program) => {
        setEditing(null);
        setDefaultProgram(program);
        setDialogOpen(true);
    };
    const openEdit = (a) => {
        setEditing(a);
        setDefaultProgram(undefined);
        setDialogOpen(true);
    };
    return (<div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Assignments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {labels.btech} and {labels.bs} side by side.
          </p>
        </div>
        <Button size="sm" onClick={() => openNew()} className="gap-1.5">
          <Plus className="h-3.5 w-3.5"/> New assignment
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProgramColumn title={labels.btech} accent="info" items={btech} sort={sortBTech} onSort={setSortBTech} onAdd={() => openNew("btech")} onEdit={openEdit} courseName={(id) => courseLabel(courses, id)}/>
        <ProgramColumn title={labels.bs} accent="success" items={bs} sort={sortBS} onSort={setSortBS} onAdd={() => openNew("bs")} onEdit={openEdit} courseName={(id) => courseLabel(courses, id)}/>
      </div>

      <AssignmentDialog open={dialogOpen} onOpenChange={setDialogOpen} assignment={editing} defaultProgram={defaultProgram}/>
    </div>);
}
function courseLabel(courses, id) {
    if (!id)
        return "Unassigned course";
    const c = (courses || []).find((c) => c.id === id);
    return c ? `${c.code} · ${c.name}` : "Unassigned course";
}
function ProgramColumn({ title, accent, items, sort, onSort, onAdd, onEdit, courseName, }) {
    const ringClass = accent === "info" ? "border-info/40" : "border-success/40";
    const dotClass = accent === "info" ? "bg-info" : "bg-success";
    return (<section className={cn("rounded-2xl border-2 bg-surface/30 p-5", ringClass)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cn("h-2 w-2 rounded-full", dotClass)}/>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <span className="font-mono text-[11px] text-muted-foreground">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={sort} onValueChange={(v) => onSort(v)}>
            <SelectTrigger className="h-7 w-[110px] text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deadline">Deadline</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={onAdd} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3"/> Add
          </Button>
        </div>
      </div>
      {items.length === 0 ? (<Card onClick={onAdd} className="cursor-pointer p-6 text-center text-xs text-muted-foreground transition hover:border-border-strong">
          No {title} assignments yet. Click to add.
        </Card>) : (<div className="grid gap-3">
          {items.map((a) => (<AssignmentCard key={a.id} a={a} onEdit={() => onEdit(a)} courseName={courseName(a.courseId)}/>))}
        </div>)}
    </section>);
}
function AssignmentCard({ a, onEdit, courseName, }) {
    const done = a.status === "completed" || a.status === "submitted";
    const overdue = !done && a.deadline && a.deadline < Date.now();
    return (<Card className={cn("group relative overflow-hidden p-4 transition hover:border-border-strong hover:shadow-sm")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <button onClick={onEdit} className={cn("text-left text-sm font-semibold leading-snug", done && "text-muted-foreground line-through")}>
            {a.title}
          </button>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{courseName}</p>
          {a.description && (<p className="mt-1.5 line-clamp-2 text-xs text-foreground/70">
              {a.description}
            </p>)}
        </div>
        <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edit">
            <Pencil className="h-3 w-3"/>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Archive" onClick={async () => {
            await db.assignments.update(a.id, { archived: true, updatedAt: Date.now() });
            toast.success("Archived", { duration: 1000 });
        }}>
            <Archive className="h-3 w-3"/>
          </Button>
          <ConfirmDelete title="Delete this assignment?" onConfirm={() => db.assignments.delete(a.id)} trigger={<Button variant="ghost" size="icon" className="h-7 w-7" title="Delete">
                <Trash2 className="h-3 w-3"/>
              </Button>}/>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className={cn("rounded-full px-2 py-0.5 font-medium capitalize", assignmentStatusChip(a.status))}>
          {overdue ? "Overdue" : STATUS_LABEL[a.status]}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 font-medium capitalize", priorityChip(a.priority))}>
          {a.priority}
        </span>
        {a.deadline && (<span className={cn("ml-auto inline-flex items-center gap-1 font-mono", overdue ? "text-critical" : deadlineTone(a.deadline, done))}>
            <CalIcon className="h-3 w-3"/> {fmtLongDate(a.deadline)}
          </span>)}
      </div>
    </Card>);
}
function priorityBefore(p) {
    switch (p) {
        case "critical": return "before:bg-critical";
        case "high": return "before:bg-high";
        case "medium": return "before:bg-medium";
        case "low": return "before:bg-success";
        default: return "before:bg-muted";
    }
}
