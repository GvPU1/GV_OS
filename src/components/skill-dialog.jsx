import { useEffect, useState } from "react";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
const EMPTY = {
    name: "",
    category: "",
    currentLevel: "beginner",
    targetLevel: "advanced",
    notes: "",
};
export function SkillDialog({ open, onOpenChange, skill }) {
    const [f, setF] = useState(EMPTY);
    useEffect(() => {
        if (!open)
            return;
        if (skill) {
            setF({
                name: skill.name,
                category: skill.category,
                currentLevel: skill.currentLevel,
                targetLevel: skill.targetLevel,
                notes: skill.notes || "",
            });
        }
        else
            setF(EMPTY);
    }, [open, skill]);
    const clear = () => setF(EMPTY);
    const save = async () => {
        if (!f.name.trim())
            return toast.error("Name is required");
        const now = Date.now();
        const payload = {
            name: f.name.trim(),
            category: f.category.trim() || "General",
            currentLevel: f.currentLevel,
            targetLevel: f.targetLevel,
            notes: f.notes || undefined,
            updatedAt: now,
        };
        if (skill?.id) {
            await db.skills.update(skill.id, payload);
            toast.success("Skill updated", { duration: 1000 });
        }
        else {
            await db.skills.add({ ...payload, createdAt: now });
            toast.success("Skill added", { duration: 1000 });
        }
        onOpenChange(false);
    };
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {skill ? "Edit skill" : "Add skill"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Skill name">
            <Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. TypeScript"/>
          </Field>
          <Field label="Category">
            <Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="e.g. Programming, Design, Soft skills"/>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Current level">
              <LevelSelect value={f.currentLevel} onChange={(v) => setF({ ...f, currentLevel: v })}/>
            </Field>
            <Field label="Target level">
              <LevelSelect value={f.targetLevel} onChange={(v) => setF({ ...f, targetLevel: v })}/>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional notes"/>
          </Field>
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
function LevelSelect({ value, onChange, }) {
    return (<Select value={value} onValueChange={(v) => onChange(v)}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="beginner">Beginner</SelectItem>
        <SelectItem value="intermediate">Intermediate</SelectItem>
        <SelectItem value="advanced">Advanced</SelectItem>
        <SelectItem value="expert">Expert</SelectItem>
      </SelectContent>
    </Select>);
}
function Field({ label, children }) {
    return (<div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>);
}
