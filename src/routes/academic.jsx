import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Pencil, Trash2, BookOpen, GraduationCap } from "lucide-react";
import { db } from "@/lib/db";
import { useSettings } from "@/lib/settings-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/confirm-delete";
export const Route = createFileRoute("/academic")({
    head: () => ({
        meta: [
            { title: "Academic Management — GV OS" },
            {
                name: "description",
                content: "Separate semester and course management for B.Tech and IITM BS.",
            },
        ],
    }),
    component: AcademicPage,
});
const GRADE_POINTS = {
    S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0,
    "A+": 10, "A-": 9, "B+": 8.5, "B-": 7.5,
};
function AcademicPage() {
    const [program, setProgram] = useState("btech");
    const labels = useSettings((s) => s.labels);
    return (<div className="mx-auto max-w-6xl space-y-5 p-5 md:p-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Academic Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organise semesters and courses for {labels.btech} and {labels.bs} independently.
        </p>
      </div>

      <Tabs value={program} onValueChange={(v) => setProgram(v)}>
        <TabsList>
          <TabsTrigger value="btech">{labels.btech}</TabsTrigger>
          <TabsTrigger value="bs">{labels.bs}</TabsTrigger>
        </TabsList>
        <TabsContent value="btech" className="mt-4">
          <ProgramView program="btech"/>
        </TabsContent>
        <TabsContent value="bs" className="mt-4">
          <ProgramView program="bs"/>
        </TabsContent>
      </Tabs>
    </div>);
}
function ProgramView({ program }) {
    const labels = useSettings((s) => s.labels);
    const semesters = useLiveQuery(() => db.semesters.where("program").equals(program).sortBy("number"), [program], []);
    const courses = useLiveQuery(() => db.courses.where("program").equals(program).toArray(), [program], []);
    const [semDialog, setSemDialog] = useState(false);
    const [courseDialog, setCourseDialog] = useState({ open: false });
    const stats = useMemo(() => {
        const list = courses || [];
        const totalCredits = list.reduce((s, c) => s + (c.credits || 0), 0);
        const earnedCredits = list
            .filter((c) => c.grade && c.grade !== "F" && GRADE_POINTS[c.grade] !== undefined)
            .reduce((s, c) => s + (c.credits || 0), 0);
        const graded = list.filter((c) => c.grade && GRADE_POINTS[c.grade] !== undefined);
        const num = graded.reduce((s, c) => s + GRADE_POINTS[c.grade] * (c.credits || 0), 0);
        const den = graded.reduce((s, c) => s + (c.credits || 0), 0);
        return {
            totalCredits,
            earnedCredits,
            cgpa: den > 0 ? num / den : 0,
            courses: list.length,
            semesters: (semesters || []).length,
        };
    }, [courses, semesters]);
    return (<div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Semesters" value={stats.semesters}/>
        <StatTile label="Courses" value={stats.courses}/>
        <StatTile label="Credits" value={`${stats.earnedCredits} / ${stats.totalCredits}`}/>
        <StatTile label="CGPA" value={stats.cgpa.toFixed(2)}/>
        <StatTile label="Program" value={program === "btech" ? labels.btech : labels.bs}/>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setSemDialog(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5"/> Add semester
        </Button>
        <Button size="sm" onClick={() => setCourseDialog({ open: true })} className="gap-1.5" disabled={(semesters || []).length === 0}>
          <Plus className="h-3.5 w-3.5"/> Add course
        </Button>
      </div>

      {(semesters || []).length === 0 ? (<Card className="flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
            <GraduationCap className="h-5 w-5"/>
          </div>
          <h2 className="text-base font-semibold">Add your first semester</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Create a semester, then add courses to it.
          </p>
          <Button size="sm" onClick={() => setSemDialog(true)}>
            Add semester
          </Button>
        </Card>) : ((semesters || []).map((s) => (<SemesterCard key={s.id} semester={s} courses={(courses || []).filter((c) => c.semesterId === s.id)} onAddCourse={() => setCourseDialog({ open: true, defaultSemId: s.id })} onEditCourse={(c) => setCourseDialog({ open: true, course: c })}/>)))}

      <SemesterDialog open={semDialog} onOpenChange={setSemDialog} program={program} existing={(semesters || []).map((s) => s.number)}/>
      <CourseDialog open={courseDialog.open} onOpenChange={(o) => setCourseDialog((s) => ({ ...s, open: o, course: o ? s.course : null }))} program={program} course={courseDialog.course} defaultSemId={courseDialog.defaultSemId} semesters={semesters || []}/>
    </div>);
}
function StatTile({ label, value }) {
    return (<Card className="p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
    </Card>);
}
function SemesterCard({ semester, courses, onAddCourse, onEditCourse, }) {
    const totalCredits = courses.reduce((s, c) => s + (c.credits || 0), 0);
    const graded = courses.filter((c) => c.grade && GRADE_POINTS[c.grade] !== undefined);
    const num = graded.reduce((s, c) => s + GRADE_POINTS[c.grade] * (c.credits || 0), 0);
    const den = graded.reduce((s, c) => s + (c.credits || 0), 0);
    const sgpa = den > 0 ? num / den : 0;
    return (<Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            Semester {semester.number}
            {semester.name ? ` · ${semester.name}` : ""}
          </h3>
          <p className="text-xs text-muted-foreground">
            {courses.length} course{courses.length === 1 ? "" : "s"} · {totalCredits}{" "}
            credits · SGPA{" "}
            <span className="font-semibold text-foreground">{sgpa.toFixed(2)}</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={onAddCourse} className="gap-1 text-xs">
            <Plus className="h-3 w-3"/> Course
          </Button>
          <ConfirmDelete title={`Delete semester ${semester.number}?`} description="Courses inside this semester will be unassigned but not deleted." onConfirm={async () => {
            await db.courses
                .where("semesterId")
                .equals(semester.id)
                .modify({ semesterId: undefined });
            await db.semesters.delete(semester.id);
        }} trigger={<Button size="icon" variant="ghost" className="h-8 w-8">
                <Trash2 className="h-3.5 w-3.5"/>
              </Button>}/>
        </div>
      </div>
      {courses.length === 0 ? (<button onClick={onAddCourse} className="block w-full px-5 py-8 text-center text-xs text-muted-foreground hover:bg-accent/30">
          No courses in this semester. Click to add one.
        </button>) : (<div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (<CourseCard key={c.id} course={c} onEdit={() => onEditCourse(c)}/>))}
        </div>)}
    </Card>);
}
function CourseCard({ course, onEdit }) {
    return (<Card className="group relative p-3 transition hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onEdit} className="min-w-0 flex-1 text-left">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            {course.code}
          </p>
          <p className="truncate text-sm font-medium">{course.name}</p>
        </button>
        <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3 w-3"/>
          </Button>
          <ConfirmDelete title="Delete this course?" onConfirm={() => db.courses.delete(course.id)} trigger={<Button size="icon" variant="ghost" className="h-7 w-7">
                <Trash2 className="h-3 w-3"/>
              </Button>}/>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
          {course.credits} credit{course.credits === 1 ? "" : "s"}
        </span>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
          {course.grade || "—"}
        </span>
      </div>
    </Card>);
}
function SemesterDialog({ open, onOpenChange, program, existing, }) {
    const next = existing.length ? Math.max(...existing) + 1 : 1;
    const [number, setNumber] = useState(next);
    const [name, setName] = useState("");
    // reset on open
    useEffect(() => {
        if (open) {
            setNumber(next);
            setName("");
        }
    }, [open, next]);
    const save = async () => {
        if (!number || number < 1)
            return toast.error("Semester number required");
        if (existing.includes(number))
            return toast.error("That semester already exists");
        await db.semesters.add({
            program,
            number,
            name: name.trim() || undefined,
            createdAt: Date.now(),
        });
        toast.success("Semester added", { duration: 1000 });
        onOpenChange(false);
    };
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add semester</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Number
            </Label>
            <Input type="number" min={1} value={number} onChange={(e) => setNumber(Number(e.target.value))}/>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Name (optional)
            </Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fall 2026"/>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Add semester</Button>
        </div>
      </DialogContent>
    </Dialog>);
}
function CourseDialog({ open, onOpenChange, program, course, defaultSemId, semesters, }) {
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [credits, setCredits] = useState(3);
    const [grade, setGrade] = useState("");
    const [semesterId, setSemesterId] = useState("");
    useEffect(() => {
        if (!open)
            return;
        if (course) {
            setCode(course.code);
            setName(course.name);
            setCredits(course.credits);
            setGrade(course.grade || "");
            setSemesterId(course.semesterId ? String(course.semesterId) : "");
        }
        else {
            setCode("");
            setName("");
            setCredits(3);
            setGrade("");
            setSemesterId(defaultSemId
                ? String(defaultSemId)
                : semesters[0]?.id
                    ? String(semesters[0].id)
                    : "");
        }
    }, [open, course, defaultSemId, semesters]);
    const save = async () => {
        if (!code.trim() || !name.trim())
            return toast.error("Code and name required");
        if (!semesterId)
            return toast.error("Pick a semester");
        const sem = semesters.find((s) => s.id === Number(semesterId));
        const payload = {
            program,
            code: code.trim(),
            name: name.trim(),
            credits: Number(credits) || 0,
            semester: sem?.number || 0,
            semesterId: Number(semesterId),
            grade: grade || undefined,
        };
        if (course?.id) {
            await db.courses.update(course.id, payload);
            toast.success("Course updated", { duration: 1000 });
        }
        else {
            await db.courses.add({ ...payload, createdAt: Date.now() });
            toast.success("Course added", { duration: 1000 });
        }
        onOpenChange(false);
    };
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{course ? "Edit course" : "Add course"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Code
              </Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)}/>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Credits
              </Label>
              <Input type="number" min={0} max={20} value={credits} onChange={(e) => setCredits(Number(e.target.value))}/>
            </div>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Name
            </Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Semester
              </Label>
              <Select value={semesterId} onValueChange={setSemesterId}>
                <SelectTrigger><SelectValue placeholder="Pick semester"/></SelectTrigger>
                <SelectContent>
                  {semesters.map((s) => (<SelectItem key={s.id} value={String(s.id)}>
                      Semester {s.number}
                      {s.name ? ` · ${s.name}` : ""}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Grade
              </Label>
              <Select value={grade || "none"} onValueChange={(v) => setGrade(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {Object.keys(GRADE_POINTS).map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{course ? "Save" : "Add course"}</Button>
        </div>
      </DialogContent>
    </Dialog>);
}
// Suppress unused lint:
void BookOpen;
