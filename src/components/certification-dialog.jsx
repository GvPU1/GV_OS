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
    name: "",
    provider: "",
    status: "planned",
    url: "",
    notes: "",
};
export function CertificationDialog({ open, onOpenChange, certification }) {
    const [f, setF] = useState(EMPTY);
    useEffect(() => {
        if (!open)
            return;
        if (certification) {
            setF({
                name: certification.name,
                provider: certification.provider,
                status: certification.status,
                url: certification.url || "",
                notes: certification.notes || "",
            });
        }
        else
            setF(EMPTY);
    }, [open, certification]);
    const clear = () => setF(EMPTY);
    const save = async () => {
        if (!f.name.trim())
            return toast.error("Name is required");
        const now = Date.now();
        const payload = {
            name: f.name.trim(),
            provider: f.provider.trim() || "—",
            status: f.status,
            url: f.url || undefined,
            notes: f.notes || undefined,
            updatedAt: now,
        };
        if (certification?.id) {
            await db.certifications.update(certification.id, payload);
            toast.success("Certification updated", { duration: 1000 });
        }
        else {
            await db.certifications.add({ ...payload, createdAt: now });
            toast.success("Certification added", { duration: 1000 });
        }
        onOpenChange(false);
    };
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {certification ? "Edit certification" : "Add certification"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Certification name">
            <Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. AWS Solutions Architect"/>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Provider">
              <Input value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })} placeholder="e.g. Amazon"/>
            </Field>
            <Field label="Status">
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Certificate URL">
            <Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://…"/>
          </Field>
          <Field label="Notes">
            <Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })}/>
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
function Field({ label, children }) {
    return (<div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>);
}
