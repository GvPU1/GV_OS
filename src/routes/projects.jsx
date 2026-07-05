import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Archive as ArchiveIcon, Calendar as CalIcon, CalendarIcon, ArrowRight, } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fmtLongDate, priorityChip, projectStatusChip } from "@/lib/format";
import { ConfirmDelete } from "@/components/confirm-delete";
import { toast } from "sonner";
export const Route = createFileRoute("/projects")({
    head: () => ({
        meta: [
            { title: "Projects — GV OS" },
            { name: "description", content: "Project management with per-project tasks." },
        ],
    }),
    component: ProjectsPage,
});
const STATUS_LABEL = {
    planned: "Planned",
    active: "Active",
    paused: "On hold",
    on_hold: "On hold",
    completed: "Completed",
    cancelled: "Cancelled",
};
function ProjectsPage() {
    const projects = useLiveQuery(() => db.projects.filter((p) => !p.archived).toArray(), [], []);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const openNew = () => {
        setEditing(null);
        setDialogOpen(true);
    };
    const openEdit = (p) => {
        setEditing(p);
        setDialogOpen(true);
    };
    return (<div className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Curated, status-aware project workspace.
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-3.5 w-3.5"/> New project
        </Button>
      </div>

      {(!projects || projects.length === 0) && (<Card className="flex flex-col items-center gap-3 p-12 text-center">
          <h2 className="text-base font-semibold">No projects yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create a project to track status, priority, and progress.
          </p>
          <Button size="sm" onClick={openNew}>Create project</Button>
        </Card>)}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(projects || []).map((p) => (<ProjectCard key={p.id} project={p} onEdit={() => openEdit(p)}/>))}
      </div>

      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} project={editing}/>
    </div>);
}
function ProjectCard({ project, onEdit, }) {
    const archive = async () => {
        await db.projects.update(project.id, { archived: true });
        toast.success("Project archived", { duration: 1000 });
    };
    // project.progress is only ever written as 0 at creation time — nothing
    // keeps it in sync with actual task completion, so derive the real
    // number from projectTasks instead of trusting the stored value.
    const tasks = useLiveQuery(() => db.projectTasks.where("projectId").equals(project.id).toArray(), [project.id], []);
    const total = (tasks || []).length;
    const done = (tasks || []).filter((t) => t.status === "done").length;
    const progress = total ? Math.round((done / total) * 100) : 0;
    return (<Card className="group relative p-5 transition hover:border-border-strong hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold leading-snug">{project.name}</h3>
          {project.description && (<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {project.description}
            </p>)}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5"/>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={archive}>
            <ArchiveIcon className="h-3.5 w-3.5"/>
          </Button>
          <ConfirmDelete title="Delete this project?" description="This will permanently remove the project." onConfirm={() => db.projects.delete(project.id)} trigger={<Button variant="ghost" size="icon" className="h-7 w-7">
                <Trash2 className="h-3.5 w-3.5"/>
              </Button>}/>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        {project.category && (<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {project.category}
          </span>)}
        <span className={cn("rounded-full px-2 py-0.5 font-medium", projectStatusChip(project.status))}>
          {STATUS_LABEL[project.status]}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 font-medium capitalize", priorityChip(project.priority))}>
          {project.priority}
        </span>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between font-mono text-[10.5px] text-muted-foreground">
          <span>Progress</span>
          <span>{progress}% {total > 0 && (<span className="text-muted-foreground/70">({done}/{total})</span>)}</span>
        </div>
        <Progress value={progress} className="h-1.5"/>
      </div>

      {(project.startDate || project.deadline) && (<div className="mt-3 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <CalIcon className="h-3 w-3"/>
          <span>{project.startDate ? fmtLongDate(project.startDate) : "—"}</span>
          <ArrowRight className="h-3 w-3"/>
          <span>{project.deadline ? fmtLongDate(project.deadline) : "—"}</span>
        </div>)}
    </Card>);
}
function ProjectDialog({ open, onOpenChange, project, }) {
    const EMPTY = {
        name: "",
        description: "",
        category: "",
        status: "planned",
        priority: "medium",
        startDate: undefined,
        deadline: undefined,
    };
    const [f, setF] = useState(EMPTY);
    useEffect(() => {
        if (!open)
            return;
        if (project) {
            setF({
                name: project.name,
                description: project.description || "",
                category: project.category || "",
                status: project.status,
                priority: project.priority,
                startDate: project.startDate ? new Date(project.startDate) : undefined,
                deadline: project.deadline ? new Date(project.deadline) : undefined,
            });
        }
        else {
            setF(EMPTY);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, project]);
    const clear = () => setF(EMPTY);
    const save = async () => {
        if (!f.name.trim())
            return toast.error("Name required");
        const now = Date.now();
        const data = {
            name: f.name.trim(),
            description: f.description || undefined,
            category: f.category || undefined,
            status: f.status,
            priority: f.priority,
            startDate: f.startDate ? f.startDate.getTime() : undefined,
            deadline: f.deadline ? f.deadline.getTime() : undefined,
            updatedAt: now,
        };
        if (project?.id) {
            await db.projects.update(project.id, data);
            toast.success("Project updated", { duration: 1000 });
        }
        else {
            await db.projects.add({ ...data, progress: 0, createdAt: now });
            toast.success("Project created", { duration: 1000 });
        }
        onOpenChange(false);
    };
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Name">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus/>
          </Field>
          <Field label="Description">
            <Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })}/>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Category">
              <Input placeholder="e.g. Personal, Client" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}/>
            </Field>
            <Field label="Priority">
              <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Status">
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Start date">
              <DatePicker value={f.startDate} onChange={(d) => setF({ ...f, startDate: d })}/>
            </Field>
            <Field label="Target date">
              <DatePicker value={f.deadline} onChange={(d) => setF({ ...f, deadline: d })}/>
            </Field>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={clear}>Clear form</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);
}
function DatePicker({ value, onChange }) {
    return (<Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-3.5 w-3.5"/>
          {value ? format(value, "MMM d, yyyy") : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={(d) => onChange(d || undefined)} initialFocus className={cn("pointer-events-auto p-3")}/>
      </PopoverContent>
    </Popover>);
}
function Field({ label, children }) {
    return (<div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>);
}
