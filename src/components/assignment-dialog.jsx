import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSettings } from "@/lib/settings-store";
const EMPTY = {
    title: "",
    description: "",
    notes: "",
    courseId: "none",
    program: "btech",
    priority: "medium",
    status: "not_started",
    date: undefined,
};
export function AssignmentDialog({ open, onOpenChange, assignment, defaultProgram, }) {
    const [f, setF] = useState(EMPTY);
    const labels = useSettings((s) => s.labels);
    const courses = useLiveQuery(() => db.courses.toArray(), [], []);
    useEffect(() => {
        if (!open)
            return;
        if (assignment) {
            setF({
                title: assignment.title,
                description: assignment.description || "",
                notes: assignment.notes || "",
                courseId: assignment.courseId ? String(assignment.courseId) : "none",
                program: assignment.program,
                priority: assignment.priority,
                status: assignment.status,
                date: assignment.deadline ? new Date(assignment.deadline) : undefined,
            });
        }
        else {
            setF({ ...EMPTY, program: defaultProgram ?? EMPTY.program });
        }
    }, [open, assignment, defaultProgram]);
    const clear = () => setF({ ...EMPTY, program: defaultProgram ?? EMPTY.program });
    const save = async () => {
        if (!f.title.trim())
            return toast.error("Title is required");
        const ts = f.date
            ? new Date(f.date.getFullYear(), f.date.getMonth(), f.date.getDate(), 23, 59).getTime()
            : undefined;
        const now = Date.now();
        const data = {
            title: f.title.trim(),
            description: f.description || undefined,
            notes: f.notes || undefined,
            courseId: f.courseId !== "none" ? Number(f.courseId) : undefined,
            program: f.program,
            priority: f.priority,
            status: f.status,
            deadline: ts,
            updatedAt: now,
        };
        if (assignment?.id) {
            await db.assignments.update(assignment.id, data);
            toast.success("Assignment updated", { duration: 1000 });
        }
        else {
            await db.assignments.add({ ...data, createdAt: now });
            toast.success("Assignment added", { duration: 1000 });
        }
        onOpenChange(false);
    };
    const programCourses = (courses || []).filter((c) => c.program === f.program);
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {assignment ? "Edit assignment" : "Add assignment"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Assignment title">
            <Input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Assignment title"/>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Program">
              <Select value={f.program} onValueChange={(v) => setF({ ...f, program: v, courseId: "none" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="btech">{labels.btech}</SelectItem>
                  <SelectItem value="bs">{labels.bs}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Course">
              <Select value={f.courseId} onValueChange={(v) => setF({ ...f, courseId: v })}>
                <SelectTrigger><SelectValue placeholder="None"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {programCourses.map((c) => (<SelectItem key={c.id} value={String(c.id)}>
                      {c.code} — {c.name}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Description">
            <Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Short description"/>
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
                  <SelectItem value="not_started">Not started</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

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

          <Field label="Notes">
            <Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Additional notes"/>
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
