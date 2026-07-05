import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Calendar, CheckSquare, GraduationCap, FolderKanban, Timer, BookOpen, Settings, LayoutDashboard, Archive, Search, Clock, Briefcase, Layers, } from "lucide-react";
import { useUiStore } from "@/lib/ui-store";
import { useSettings } from "@/lib/settings-store";
import { db } from "@/lib/db";
import { Dialog, DialogContent } from "@/components/ui/dialog";
const PAGES = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/calendar", label: "Calendar", icon: Calendar },
    { to: "/tasks", label: "Tasks", icon: CheckSquare },
    { to: "/assignments", label: "Assignments", icon: BookOpen },
    { to: "/academic", label: "Academic Management", icon: GraduationCap },
    { to: "/projects", label: "Projects", icon: FolderKanban },
    { to: "/career", label: "Career Hub", icon: Briefcase },
    { to: "/knowledge", label: "Knowledge Vault", icon: BookOpen },
    { to: "/study", label: "Study Center", icon: Timer },
    { to: "/archive", label: "Archive", icon: Archive },
    { to: "/settings", label: "Settings", icon: Settings },
];
export function CommandPalette() {
    const { cmdOpen, openCmd, closeCmd, openCapture } = useUiStore();
    const { recents, pushRecent, clearRecents } = useSettings();
    const [q, setQ] = useState("");
    const navigate = useNavigate();
    useEffect(() => {
        const onKey = (e) => {
            const meta = e.metaKey || e.ctrlKey;
            if (meta && e.key.toLowerCase() === "k") {
                e.preventDefault();
                cmdOpen ? closeCmd() : openCmd();
            }
            if (meta && e.key.toLowerCase() === "n") {
                e.preventDefault();
                openCapture();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [cmdOpen, openCmd, closeCmd, openCapture]);
    const tasks = useLiveQuery(() => db.tasks.limit(100).toArray(), [], []);
    const assignments = useLiveQuery(() => db.assignments.limit(100).toArray(), [], []);
    const events = useLiveQuery(() => db.events.limit(100).toArray(), [], []);
    const notes = useLiveQuery(() => db.notes.limit(100).toArray(), [], []);
    const projects = useLiveQuery(() => db.projects.limit(100).toArray(), [], []);
    const projectTasks = useLiveQuery(() => db.projectTasks.limit(100).toArray(), [], []);
    const courses = useLiveQuery(() => db.courses.limit(100).toArray(), [], []);
    const results = useMemo(() => {
        const needle = q.trim().toLowerCase();
        const match = (s) => !needle || s.toLowerCase().includes(needle);
        return {
            tasks: (tasks || []).filter((t) => match(t.title)).slice(0, 6),
            assignments: (assignments || []).filter((a) => match(a.title)).slice(0, 6),
            events: (events || []).filter((e) => match(e.title)).slice(0, 6),
            notes: (notes || []).filter((n) => match(n.title)).slice(0, 6),
            projects: (projects || []).filter((p) => match(p.name)).slice(0, 6),
            projectTasks: (projectTasks || []).filter((p) => match(p.title)).slice(0, 6),
            courses: (courses || [])
                .filter((c) => match(c.code) || match(c.name))
                .slice(0, 6),
        };
    }, [q, tasks, assignments, events, notes, projects, projectTasks, courses]);
    const go = (to) => {
        if (q.trim())
            pushRecent(q.trim());
        closeCmd();
        setQ("");
        navigate({ to });
    };
    const showRecents = !q.trim() && recents.length > 0;
    return (<Dialog open={cmdOpen} onOpenChange={(o) => (o ? openCmd() : closeCmd())}>
      <DialogContent className="top-[18%] max-w-2xl translate-y-0 overflow-hidden p-0 sm:rounded-2xl" style={{
            backdropFilter: "saturate(160%) blur(20px)",
            background: "color-mix(in oklab, var(--popover) 88%, transparent)",
        }}>
        <Command label="Global search" className="bg-transparent">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <Search className="h-5 w-5 text-muted-foreground"/>
            <Command.Input value={q} onValueChange={setQ} placeholder="Search tasks, assignments, projects, courses, notes…" className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground" autoFocus/>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              esc
            </kbd>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-10 text-center text-sm text-muted-foreground">
              No results.
            </Command.Empty>

            {showRecents && (<Command.Group heading="Recent" className="cmdk-group">
                <div className="flex items-center justify-between px-2.5 pb-1 pt-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent
                  </span>
                  <button onClick={clearRecents} className="text-[10px] text-muted-foreground hover:text-foreground">
                    Clear
                  </button>
                </div>
                {recents.map((r) => (<Command.Item key={r} value={`recent ${r}`} onSelect={() => setQ(r)} className={ITEM_CLS}>
                    <Clock className="h-3.5 w-3.5 text-muted-foreground"/>
                    {r}
                  </Command.Item>))}
              </Command.Group>)}

            <Command.Group heading="Quick access" className="cmdk-group">
              <GroupLabel>Quick access</GroupLabel>
              {PAGES.map((p) => {
            const Icon = p.icon;
            return (<Command.Item key={p.to} value={`go ${p.label}`} onSelect={() => go(p.to)} className={ITEM_CLS}>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground"/>
                    {p.label}
                  </Command.Item>);
        })}
            </Command.Group>

            {results.tasks.length > 0 && (<ResultGroup label="Tasks">
                {results.tasks.map((t) => (<Command.Item key={`t-${t.id}`} value={`task ${t.title}`} onSelect={() => go("/tasks")} className={ITEM_CLS}>
                    <CheckSquare className="h-3.5 w-3.5 text-muted-foreground"/>
                    <span className="truncate">{t.title}</span>
                    <span className="ml-auto text-xs capitalize text-muted-foreground">
                      {t.program}
                    </span>
                  </Command.Item>))}
              </ResultGroup>)}

            {results.assignments.length > 0 && (<ResultGroup label="Assignments">
                {results.assignments.map((a) => (<Command.Item key={`a-${a.id}`} value={`assignment ${a.title}`} onSelect={() => go("/assignments")} className={ITEM_CLS}>
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground"/>
                    <span className="truncate">{a.title}</span>
                  </Command.Item>))}
              </ResultGroup>)}

            {results.projects.length > 0 && (<ResultGroup label="Projects">
                {results.projects.map((p) => (<Command.Item key={`p-${p.id}`} value={`project ${p.name}`} onSelect={() => go("/projects")} className={ITEM_CLS}>
                    <FolderKanban className="h-3.5 w-3.5 text-muted-foreground"/>
                    <span className="truncate">{p.name}</span>
                  </Command.Item>))}
              </ResultGroup>)}

            {results.projectTasks.length > 0 && (<ResultGroup label="Project tasks">
                {results.projectTasks.map((p) => (<Command.Item key={`pt-${p.id}`} value={`ptask ${p.title}`} onSelect={() => go("/projects")} className={ITEM_CLS}>
                    <Layers className="h-3.5 w-3.5 text-muted-foreground"/>
                    <span className="truncate">{p.title}</span>
                  </Command.Item>))}
              </ResultGroup>)}

            {results.courses.length > 0 && (<ResultGroup label="Courses">
                {results.courses.map((c) => (<Command.Item key={`c-${c.id}`} value={`course ${c.code} ${c.name}`} onSelect={() => go("/academic")} className={ITEM_CLS}>
                    <GraduationCap className="h-3.5 w-3.5 text-muted-foreground"/>
                    <span className="truncate">
                      {c.code} — {c.name}
                    </span>
                  </Command.Item>))}
              </ResultGroup>)}

            {results.events.length > 0 && (<ResultGroup label="Events">
                {results.events.map((e) => (<Command.Item key={`e-${e.id}`} value={`event ${e.title}`} onSelect={() => go("/calendar")} className={ITEM_CLS}>
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground"/>
                    <span className="truncate">{e.title}</span>
                  </Command.Item>))}
              </ResultGroup>)}

            {results.notes.length > 0 && (<ResultGroup label="Knowledge Vault">
                {results.notes.map((n) => (<Command.Item key={`n-${n.id}`} value={`note ${n.title}`} onSelect={() => go("/knowledge")} className={ITEM_CLS}>
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground"/>
                    <span className="truncate">{n.title}</span>
                  </Command.Item>))}
              </ResultGroup>)}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>);
}
const ITEM_CLS = "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground";
function GroupLabel({ children }) {
    return (<p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>);
}
function ResultGroup({ label, children, }) {
    return (<Command.Group heading={label} className="cmdk-group">
      <GroupLabel>{label}</GroupLabel>
      {children}
    </Command.Group>);
}
