import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Pencil, Trash2, Lightbulb, Archive as ArchiveIcon } from "lucide-react";
import { ideaStatusChip } from "@/lib/format";
import { db, } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { IdeaDialog } from "@/components/idea-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
export const Route = createFileRoute("/ideas")({
    head: () => ({
        meta: [
            { title: "Idea Lab — GV OS" },
            { name: "description", content: "Capture and evaluate ideas." },
        ],
    }),
    component: IdeaLab,
});
const PRIORITY_LABEL = {
    low: "Low",
    medium: "Medium",
    high: "High",
};
const STATUS_LABEL = {
    captured: "Captured",
    evaluating: "Evaluating",
    planned: "Planned",
    active: "Active",
    complete: "Complete",
};
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const STATUS_ORDER = {
    active: 0,
    planned: 1,
    evaluating: 2,
    captured: 3,
    complete: 4,
};
function IdeaLab() {
    const ideas = useLiveQuery(() => db.ideas.filter((i) => !i.archived).toArray(), [], []);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("priority");
    const categories = useMemo(() => {
        const s = new Set();
        (ideas || []).forEach((i) => s.add(i.category));
        return Array.from(s);
    }, [ideas]);
    const filtered = useMemo(() => {
        let list = (ideas || []).slice();
        if (categoryFilter !== "all")
            list = list.filter((i) => i.category === categoryFilter);
        if (statusFilter !== "all")
            list = list.filter((i) => i.status === statusFilter);
        if (sortBy === "priority")
            list.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
        else if (sortBy === "category")
            list.sort((a, b) => a.category.localeCompare(b.category));
        else
            list.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
        return list;
    }, [ideas, categoryFilter, statusFilter, sortBy]);
    const total = (ideas || []).length;
    const active = (ideas || []).filter((i) => i.status === "active" || i.status === "planned").length;
    const complete = (ideas || []).filter((i) => i.status === "complete").length;
    const openNew = () => {
        setEditing(null);
        setDialogOpen(true);
    };
    const openEdit = (i) => {
        setEditing(i);
        setDialogOpen(true);
    };
    return (<div className="mx-auto max-w-7xl space-y-5 p-5 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Idea Lab</h1>
          <p className="text-sm text-muted-foreground">
            Capture, evaluate, and develop ideas.
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-3.5 w-3.5"/> New idea
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Total ideas" value={total}/>
        <SummaryCard label="Active" value={active} accent="text-primary"/>
        <SummaryCard label="Completed" value={complete} accent="text-success"/>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter label="Category" value={categoryFilter} onChange={setCategoryFilter} options={[
            { v: "all", l: "All" },
            ...categories.map((c) => ({ v: c, l: c })),
        ]}/>
        <Filter label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v)} options={[
            { v: "all", l: "All" },
            ...Object.keys(STATUS_LABEL).map((s) => ({
                v: s,
                l: STATUS_LABEL[s],
            })),
        ]}/>
        <Filter label="Sort" value={sortBy} onChange={(v) => setSortBy(v)} options={[
            { v: "priority", l: "Priority" },
            { v: "category", l: "Category" },
            { v: "status", l: "Status" },
        ]}/>
      </div>

      {filtered.length === 0 ? (<Card className="flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Lightbulb className="h-5 w-5"/>
          </div>
          <h2 className="text-base font-semibold">No ideas yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Capture a spark and develop it later.
          </p>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5"/> New idea
          </Button>
        </Card>) : (<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (<IdeaCard key={i.id} idea={i} onEdit={() => openEdit(i)}/>))}
        </div>)}

      <IdeaDialog open={dialogOpen} onOpenChange={setDialogOpen} idea={editing}/>
    </div>);
}
function SummaryCard({ label, value, accent, }) {
    return (<Card className="p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-3xl font-semibold tabular-nums", accent)}>{value}</p>
    </Card>);
}
function Filter({ label, value, onChange, options, }) {
    return (<div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (<SelectItem key={o.v} value={o.v}>
              {o.l}
            </SelectItem>))}
        </SelectContent>
      </Select>
    </div>);
}
function IdeaCard({ idea, onEdit }) {
    const archive = () => db.ideas.update(idea.id, { archived: true });
    return (<Card className={cn("group relative overflow-hidden p-4 transition hover:border-border-strong hover:shadow-sm")}>
      <div className="flex items-start justify-between gap-2">
        <button onClick={onEdit} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold">{idea.title}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{idea.category}</p>
        </button>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3 w-3"/>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={archive}>
            <ArchiveIcon className="h-3 w-3"/>
          </Button>
          <ConfirmDelete title="Delete this idea?" onConfirm={() => db.ideas.delete(idea.id)} trigger={<Button variant="ghost" size="icon" className="h-7 w-7">
                <Trash2 className="h-3 w-3"/>
              </Button>}/>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className={cn("rounded-full px-2 py-0.5 font-medium", idea.priority === "high"
            ? "bg-high/15 text-high"
            : idea.priority === "medium"
                ? "bg-medium/20 text-medium"
                : "bg-success/15 text-success")}>
          {PRIORITY_LABEL[idea.priority]}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 font-medium", ideaStatusChip(idea.status))}>
          {STATUS_LABEL[idea.status]}
        </span>
      </div>
      {idea.description && (<p className="mt-2.5 line-clamp-2 text-xs text-muted-foreground">
          {idea.description}
        </p>)}
    </Card>);
}
