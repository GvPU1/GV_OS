import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { db } from "@/lib/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
const EMPTY = {
    title: "",
    date: undefined,
    time: "",
    kind: "personal",
    notes: "",
};
export function EventDialog({ open, onOpenChange, defaultDate, event }) {
    const [f, setF] = useState(EMPTY);
    useEffect(() => {
        if (!open)
            return;
        if (event) {
            const d = new Date(event.start);
            const pad = (n) => String(n).padStart(2, "0");
            setF({
                title: event.title,
                date: d,
                time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
                kind: event.kind,
                notes: event.notes || "",
            });
        }
        else {
            setF({ ...EMPTY, date: defaultDate });
        }
    }, [open, event, defaultDate]);
    const clear = () => setF({ ...EMPTY, date: defaultDate });
    const save = async () => {
        if (!f.title.trim())
            return toast.error("Title is required");
        if (!f.date)
            return toast.error("Date is required");
        const [hh, mm] = (f.time || "09:00").split(":").map(Number);
        const start = new Date(f.date.getFullYear(), f.date.getMonth(), f.date.getDate(), hh || 9, mm || 0).getTime();
        if (event?.id) {
            await db.events.update(event.id, {
                title: f.title.trim(),
                start,
                kind: f.kind,
                notes: f.notes || undefined,
            });
            toast.success("Event updated", { duration: 1000 });
        }
        else {
            await db.events.add({
                title: f.title.trim(),
                start,
                kind: f.kind,
                notes: f.notes || undefined,
                createdAt: Date.now(),
            });
            toast.success("Event added", { duration: 1000 });
        }
        onOpenChange(false);
    };
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {event ? "Edit event" : "Add event"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Event name">
            <Input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Event title"/>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Date">
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
            <Field label="Time">
              <Input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })}/>
            </Field>
          </div>

          <Field label="Category">
            <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Notes">
            <Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional notes"/>
          </Field>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="ghost" onClick={clear}>
            Clear form
          </Button>
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
function Field({ label, children, }) {
    return (<div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>);
}
