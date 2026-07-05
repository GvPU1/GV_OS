import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useUiStore } from "@/lib/ui-store";
import { db } from "@/lib/db";
import { useSettings } from "@/lib/settings-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
export function QuickCapture() {
    const { captureOpen, captureKind, closeCapture, openCapture } = useUiStore();
    const labels = useSettings((s) => s.labels);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [program, setProgram] = useState("personal");
    const [priority, setPriority] = useState("medium");
    const [date, setDate] = useState();
    const reset = () => {
        setTitle("");
        setBody("");
        setDate(undefined);
    };
    const save = async () => {
        if (!title.trim()) {
            toast.error("Please enter a title");
            return;
        }
        const now = Date.now();
        const ts = date ? date.getTime() : undefined;
        try {
            switch (captureKind) {
                case "task":
                    await db.tasks.add({
                        title: title.trim(),
                        program,
                        priority,
                        status: "todo",
                        tags: [],
                        notes: body || undefined,
                        dueDate: ts,
                        createdAt: now,
                        updatedAt: now,
                    });
                    break;
                case "assignment":
                    await db.assignments.add({
                        title: title.trim(),
                        program: program === "personal" ? "btech" : program,
                        priority,
                        status: "not_started",
                        notes: body || undefined,
                        deadline: ts,
                        createdAt: now,
                        updatedAt: now,
                    });
                    break;
                case "note":
                case "idea":
                    await db.notes.add({
                        title: title.trim(),
                        body,
                        tags: captureKind === "idea" ? ["idea"] : [],
                        category: captureKind === "idea" ? "Ideas" : undefined,
                        createdAt: now,
                        updatedAt: now,
                    });
                    break;
                case "event":
                    await db.events.add({
                        title: title.trim(),
                        start: ts || now,
                        kind: "personal",
                        notes: body || undefined,
                        createdAt: now,
                    });
                    break;
            }
            toast.success("Saved", { duration: 1000 });
            reset();
            closeCapture();
        }
        catch (e) {
            toast.error("Could not save");
            console.error(e);
        }
    };
    return (<Dialog open={captureOpen} onOpenChange={(o) => (o ? openCapture(captureKind) : closeCapture())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Quick Capture</DialogTitle>
        </DialogHeader>

        <Tabs value={captureKind} onValueChange={(v) => openCapture(v)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="task">Task</TabsTrigger>
            <TabsTrigger value="note">Note</TabsTrigger>
            <TabsTrigger value="idea">Idea</TabsTrigger>
            <TabsTrigger value="assignment">Assign.</TabsTrigger>
            <TabsTrigger value="event">Event</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          <Input autoFocus placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                save();
        }}/>
          <Textarea placeholder="Notes (optional)" value={body} onChange={(e) => setBody(e.target.value)} rows={3}/>

          <div className="grid grid-cols-2 gap-2">
            {(captureKind === "task" || captureKind === "assignment") && (<>
                <Select value={program} onValueChange={(v) => setProgram(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="btech">{labels.btech}</SelectItem>
                    <SelectItem value="bs">{labels.bs}</SelectItem>
                    {captureKind === "task" && (<SelectItem value="personal">Personal</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={priority} onValueChange={(v) => setPriority(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </>)}
            {(captureKind === "task" ||
            captureKind === "assignment" ||
            captureKind === "event") && (<Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("col-span-2 w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5"/>
                    {date ? format(date, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => setDate(d || undefined)} initialFocus className={cn("pointer-events-auto p-3")}/>
                </PopoverContent>
              </Popover>)}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ⌘↵
            </kbd>{" "}
            to save
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={closeCapture}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);
}
