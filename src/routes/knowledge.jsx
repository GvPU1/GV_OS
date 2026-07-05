import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, Tag as TagIcon, Search, Archive as ArchiveIcon } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RichEditor } from "@/components/rich-editor";
import { cn } from "@/lib/utils";
import { fmtRelative } from "@/lib/format";
import { toast } from "sonner";
export const Route = createFileRoute("/knowledge")({
    head: () => ({
        meta: [
            { title: "Knowledge Vault — GV OS" },
            { name: "description", content: "Notes, research and reference material with rich text editing." },
        ],
    }),
    component: KnowledgePage,
});
function KnowledgePage() {
    const notes = useLiveQuery(() => db.notes.filter((n) => !n.archived).reverse().sortBy("updatedAt"), [], []);
    const [activeId, setActiveId] = useState(null);
    const [q, setQ] = useState("");
    const [cat, setCat] = useState("all");
    const categories = useMemo(() => {
        const s = new Set();
        (notes || []).forEach((n) => n.category && s.add(n.category));
        return Array.from(s);
    }, [notes]);
    const filtered = useMemo(() => {
        const list = (notes || []).slice().sort((a, b) => b.updatedAt - a.updatedAt);
        const needle = q.trim().toLowerCase();
        return list.filter((n) => (cat === "all" || n.category === cat) &&
            (!needle ||
                n.title.toLowerCase().includes(needle) ||
                n.body.toLowerCase().includes(needle) ||
                n.tags.some((t) => t.toLowerCase().includes(needle))));
    }, [notes, q, cat]);
    const active = filtered.find((n) => n.id === activeId) || filtered[0];
    const create = async () => {
        const now = Date.now();
        const id = await db.notes.add({
            title: "Untitled",
            body: "",
            tags: [],
            createdAt: now,
            updatedAt: now,
        });
        setActiveId(id);
    };
    return (<div className="flex h-full min-h-0">
      <aside className="flex w-72 shrink-0 flex-col border-r border-border">
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight">Knowledge</h1>
            <Button size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={create}>
              <Plus className="h-3.5 w-3.5"/>
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"/>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes…" className="h-8 pl-8 text-xs"/>
          </div>
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            <CatPill active={cat === "all"} onClick={() => setCat("all")}>All</CatPill>
            {categories.map((c) => (<CatPill key={c} active={cat === c} onClick={() => setCat(c)}>
                {c}
              </CatPill>))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (<p className="px-4 py-10 text-center text-xs text-muted-foreground">No notes yet.</p>)}
          {filtered.map((n) => (<button key={n.id} onClick={() => setActiveId(n.id)} className={cn("block w-full border-b border-border px-3 py-2.5 text-left transition hover:bg-accent/40", active?.id === n.id && "bg-accent/60")}>
              <p className="truncate text-[13px] font-medium">{n.title || "Untitled"}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {stripHtml(n.body).slice(0, 80) || "Empty note"}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/80">{fmtRelative(n.updatedAt)}</p>
            </button>))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {active ? <Editor note={active} key={active.id}/> : <EmptyState onCreate={create}/>}
      </section>
    </div>);
}
function CatPill({ active, onClick, children }) {
    return (<button onClick={onClick} className={cn("shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11px] capitalize transition", active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent")}>
      {children}
    </button>);
}
function Editor({ note }) {
    const [title, setTitle] = useState(note.title);
    const [body, setBody] = useState(note.body);
    const [category, setCategory] = useState(note.category || "");
    const [tagInput, setTagInput] = useState("");
    const persist = (patch) => db.notes.update(note.id, { ...patch, updatedAt: Date.now() });
    const addTag = async () => {
        const t = tagInput.trim();
        if (!t)
            return;
        if (note.tags.includes(t))
            return setTagInput("");
        await persist({ tags: [...note.tags, t] });
        setTagInput("");
    };
    const removeTag = (t) => persist({ tags: note.tags.filter((x) => x !== t) });
    const archive = async () => {
        await db.notes.update(note.id, { archived: true });
        toast.success("Note archived", { duration: 1000 });
    };
    const remove = async () => {
        await db.notes.delete(note.id);
        toast.success("Note deleted", { duration: 1000 });
    };
    return (<div className="mx-auto w-full max-w-3xl space-y-3 p-5 md:p-8">
      <div className="flex items-center gap-2">
        <Input value={title} onChange={(e) => {
            setTitle(e.target.value);
            persist({ title: e.target.value });
        }} placeholder="Title" className="h-auto border-0 bg-transparent px-0 text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-0"/>
        <Button variant="ghost" size="icon" onClick={archive} title="Archive">
          <ArchiveIcon className="h-4 w-4"/>
        </Button>
        <Button variant="ghost" size="icon" onClick={remove} title="Delete">
          <Trash2 className="h-4 w-4"/>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input value={category} onChange={(e) => {
            setCategory(e.target.value);
            persist({ category: e.target.value || undefined });
        }} placeholder="Category" className="h-7 w-40 text-xs"/>
        <div className="flex flex-wrap items-center gap-1.5">
          {note.tags.map((t) => (<button key={t} onClick={() => removeTag(t)} className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground hover:opacity-80">
              <TagIcon className="h-2.5 w-2.5"/>
              {t}
              <span className="text-muted-foreground">×</span>
            </button>))}
          <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="add tag…" className="h-7 w-28 text-xs"/>
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground">
          Updated {fmtRelative(note.updatedAt)}
        </span>
      </div>

      <RichEditor value={body} onChange={(v) => {
            setBody(v);
            persist({ body: v });
        }}/>
    </div>);
}
function EmptyState({ onCreate }) {
    return (<div className="grid flex-1 place-items-center p-10">
      <Card className="flex max-w-md flex-col items-center gap-3 p-10 text-center">
        <h2 className="text-base font-semibold">Your Knowledge Vault</h2>
        <p className="text-sm text-muted-foreground">
          Capture research, references and long-form notes with rich formatting.
        </p>
        <Button onClick={onCreate} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5"/> New note
        </Button>
      </Card>
    </div>);
}
function stripHtml(html) {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
