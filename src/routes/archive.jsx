import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArchiveRestore, Trash2, Search } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtRelative } from "@/lib/format";
import { toast } from "sonner";
export const Route = createFileRoute("/archive")({
    head: () => ({
        meta: [
            { title: "Archive — GV OS" },
            { name: "description", content: "Restore or permanently delete archived items." },
        ],
    }),
    component: ArchivePage,
});
const KINDS = [
    { v: "tasks", l: "Tasks" },
    { v: "assignments", l: "Assignments" },
    { v: "projects", l: "Projects" },
    { v: "notes", l: "Notes" },
    { v: "events", l: "Events" },
];
function ArchivePage() {
    const [kind, setKind] = useState("tasks");
    const [q, setQ] = useState("");
    const tableFor = (k) => {
        switch (k) {
            case "tasks": return db.tasks;
            case "assignments": return db.assignments;
            case "projects": return db.projects;
            case "notes": return db.notes;
            case "events": return db.events;
        }
    };
    const items = useLiveQuery(() => tableFor(kind).filter((x) => !!x.archived).toArray(), [kind], []);
    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return (items || []).filter((i) => {
            const label = (i.title || i.name || "").toLowerCase();
            return !needle || label.includes(needle);
        });
    }, [items, q]);
    const restore = async (id) => {
        await tableFor(kind).update(id, { archived: false });
        toast.success("Restored", { duration: 1000 });
    };
    const remove = async (id) => {
        await tableFor(kind).delete(id);
        toast.success("Permanently deleted", { duration: 1000 });
    };
    return (<div className="mx-auto max-w-5xl space-y-4 p-5 md:p-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Archive</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Restore archived items or remove them forever.
        </p>
      </div>

      <Tabs value={kind} onValueChange={(v) => setKind(v)}>
        <TabsList>
          {KINDS.map((k) => (<TabsTrigger key={k.v} value={k.v}>{k.l}</TabsTrigger>))}
        </TabsList>
      </Tabs>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"/>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search archived…" className="h-9 pl-8 text-sm"/>
      </div>

      <Card className="overflow-hidden p-0">
        {filtered.length === 0 && (<p className="px-4 py-12 text-center text-sm text-muted-foreground">Nothing archived here.</p>)}
        <div className="divide-y divide-border">
          {filtered.map((i) => (<div key={i.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{i.title || i.name || "Untitled"}</p>
                <p className="text-[11px] text-muted-foreground">
                  Archived · created {fmtRelative(i.createdAt || Date.now())}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => restore(i.id)} className="gap-1.5">
                <ArchiveRestore className="h-3.5 w-3.5"/> Restore
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(i.id)} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5"/>
              </Button>
            </div>))}
        </div>
      </Card>
    </div>);
}
