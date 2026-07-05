import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { db, } from "@/lib/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
export const PT_STATUS = [
    { v: "backlog", l: "Backlog" },
    { v: "planned", l: "Planned" },
    { v: "in_progress", l: "In Progress" },
    { v: "review", l: "Review" },
    { v: "testing", l: "Testing" },
    { v: "done", l: "Completed" },
    { v: "blocked", l: "Blocked" },
    { v: "cancelled", l: "Cancelled" },
];
const EMPTY = {
    title: "",
    description: "",
    priority: "medium",
    status: "backlog",
    date: undefined,
    estimateHours: "",
    labels: "",
};
export function ProjectTaskDialog({ open, onOpenChange, projectId, task }) {
    const [f, setF] = useState(EMPTY);
    useEffect(() => {
        if (!open)
            return;
        if (task) {
            setF({
                title: task.title,
                description: task.description ?? "",
                priority: task.priority,
                status: task.status ?? "backlog",
                date: task.dueDate ? new Date(task.dueDate) : undefined,
                estimateHours: task.estimateHours ? String(task.estimateHours) : "",
                labels: (task.labels || []).join(", "),
            });
        }
        else {
            setF(EMPTY);
        }
    }, [open, task]);
    const clear = () => setF(EMPTY);
    const save = async () => {
        if (!f.title.trim())
            return toast.error("Title is required");
        const pid = task?.projectId ?? projectId;
        if (!pid)
            return toast.error("Project required");
        const ts = f.date
            ? new Date(f.date.getFullYear(), f.date.getMonth(), f.date.getDate(), 23, 59).getTime()
            : undefined;
        const labels = f.labels
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const est = f.estimateHours ? Number(f.estimateHours) : undefined;
        const payload = {
            title: f.title.trim(),
            description: f.description.trim() || undefined,
            priority: f.priority,
            status: f.status,
            dueDate: ts,
            projectId: pid,
            labels: labels.length ? labels : undefined,
            estimateHours: est && !Number.isNaN(est) ? est : undefined,
        };
        if (task?.id) {
            await db.projectTasks.update(task.id, payload);
            toast.success("Task updated", { duration: 1000 });
        }
        else {
            await db.projectTasks.add({ ...payload, createdAt: Date.now() });
            toast.success("Task added", { duration: 1000 });
        }
        onOpenChange(false);
    };
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {task ? "Edit project task" : "Add project task"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Title">
            <Input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="What needs to be done?"/>
          </Field>

          <Field label="Description">
            <Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Optional details, links, context…"/>
          </Field>

          <div className="grid grid-cols-2 gap-2">
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
            <Field label="Status">
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PT_STATUS.map((s) => (<SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Due date">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !f.date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5"/>
                    {f.date ? format(f.date, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={f.date} onSelect={(d) => setF({ ...f, date: d || undefined })} initialFocus className={cn("pointer-events-auto p-3")}/>
                </PopoverContent>
              </Popover>
            </Field>
            <Field label="Est. hours">
              <Input type="number" min={0} step={0.5} value={f.estimateHours} onChange={(e) => setF({ ...f, estimateHours: e.target.value })} placeholder="e.g. 4"/>
            </Field>
          </div>

          <Field label="Labels (comma separated)">
            <Input value={f.labels} onChange={(e) => setF({ ...f, labels: e.target.value })} placeholder="frontend, urgent"/>
          </Field>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="ghost" onClick={clear}>Clear form</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);
}
function Field({ label, children }) {
    return (<div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>);
}
