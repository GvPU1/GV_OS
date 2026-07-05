import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Calendar, CheckSquare, GraduationCap, FolderKanban, Timer, BookOpen, Archive, Settings, Search, Sparkles, Briefcase, ListChecks, Lightbulb, Bell, } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/ui-store";
import { useSettings } from "@/lib/settings-store";
const GROUPS = [
    {
        label: "Overview",
        items: [
            { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
            { to: "/calendar", label: "Calendar", icon: Calendar },
            { to: "/notifications", label: "Notifications", icon: Bell },
        ],
    },
    {
        label: "Academics",
        items: [
            { to: "/academic", label: "Academic Management", icon: GraduationCap },
            { to: "/assignments", label: "Assignments", icon: BookOpen },
        ],
    },
    {
        label: "Work",
        items: [
            { to: "/tasks", label: "Tasks", icon: CheckSquare },
            { to: "/projects", label: "Projects", icon: FolderKanban },
            { to: "/project-tasks", label: "Project Tasks", icon: ListChecks },
        ],
    },
    {
        label: "Growth",
        items: [
            { to: "/career", label: "Career Hub", icon: Briefcase },
            { to: "/knowledge", label: "Knowledge Vault", icon: Sparkles },
            { to: "/ideas", label: "Idea Lab", icon: Lightbulb },
        ],
    },
    {
        label: "Focus",
        items: [{ to: "/study", label: "Study Center", icon: Timer }],
    },
    {
        label: "System",
        items: [
            { to: "/archive", label: "Archive", icon: Archive },
            { to: "/settings", label: "Settings", icon: Settings },
        ],
    },
];
export function AppShell({ children }) {
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const openCmd = useUiStore((s) => s.openCmd);
    const appName = useSettings((s) => s.appName);
    const appLogo = useSettings((s) => s.appLogo);
    const hydrate = useSettings((s) => s.hydrate);
    useEffect(() => {
        hydrate();
    }, [hydrate]);
    const isImageLogo = appLogo?.startsWith("data:") || appLogo?.startsWith("http");
    return (<div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4" suppressHydrationWarning>
          {isImageLogo ? (<img src={appLogo} alt="" className="h-7 w-7 rounded-md object-cover"/>) : (<div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-[11px] font-semibold tracking-tight">
              {appLogo?.slice(0, 2) || "GV"}
            </div>)}
          <span className="truncate text-[15px] font-semibold tracking-tight text-sidebar-foreground">
            {appName}
          </span>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
          {GROUPS.map((g) => (<div key={g.label}>
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {g.label}
              </p>
              <div className="space-y-0.5">
                {g.items.map((n) => {
                const active = n.exact
                    ? pathname === n.to
                    : pathname.startsWith(n.to);
                const Icon = n.icon;
                return (<Link key={n.to} to={n.to} className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors", active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground")}>
                      <Icon className="h-4 w-4"/>
                      {n.label}
                    </Link>);
            })}
              </div>
            </div>))}
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex h-16 items-center justify-center border-b border-border px-4 backdrop-blur-xl">
          <button onClick={openCmd} className="group flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-border/60 bg-surface/50 px-5 py-2.5 text-left text-sm text-muted-foreground shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-border-strong hover:bg-surface/80 hover:shadow-md focus:outline-none focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/15">
            <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-foreground"/>
            <span className="flex-1 truncate">Search anything in {appName}…</span>
            <kbd className="rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>);
}
