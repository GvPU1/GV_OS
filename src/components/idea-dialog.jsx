import { useEffect, useState } from "react";
import { toast } from "sonner";
import { db, } from "@/lib/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
const EMPTY = {
    title: "",
    description: "",
    category: "",
    priority: "medium",
    status: "captured",
};
export function IdeaDialog({ open, onOpenChange, idea }) {
    const [f, setF] = useState(EMPTY);
    useEffect(() => {
        if (!open)
            return;
        if (idea) {
            setF({
                title: idea.title,
                description: idea.description || "",
                category: idea.category,
                priority: idea.priority,
                status: idea.status,
            });
        }
        else
            setF(EMPTY);
    }, [open, idea]);
    const clear = () => setF(EMPTY);
    const save = async () => {
        if (!f.title.trim())
            return toast.error("Title is required");
        const now = Date.now();
        const payload = {
            title: f.title.trim(),
            description: f.description || undefined,
            category: f.category.trim() || "General",
            priority: f.priority,
            status: f.status,
            updatedAt: now,
        };
        if (idea?.id) {
            await db.ideas.update(idea.id, payload);
            toast.success("Idea updated", { duration: 1000 });
        }
        else {
            await db.ideas.add({ ...payload, createdAt: now });
            toast.success("Idea captured", { duration: 1000 });
        }
        onOpenChange(false);
    };
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {idea ? "Edit idea" : "New idea"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Title">
            <Input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="A spark of an idea…"/>
          </Field>
          <Field label="Description">
            <Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Optional details"/>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Category">
              <Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Product"/>
            </Field>
            <Field label="Priority">
              <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="captured">Captured</SelectItem>
                  <SelectItem value="evaluating">Evaluating</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="ghost" onClick={clear}>Clear form</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
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
