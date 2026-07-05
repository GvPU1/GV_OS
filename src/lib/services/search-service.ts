import { db } from "@/lib/db";

/**
 * Universal search, built to back both the current ad-hoc command palette
 * (see `components/command-palette.jsx`, which today queries each table
 * itself) and a future Ctrl+K palette / AI search. Every result is
 * normalized to the same shape so callers don't need to know which table
 * it came from to render or navigate to it.
 */
export type SearchResultType =
  | "task"
  | "assignment"
  | "project"
  | "projectTask"
  | "event"
  | "note"
  | "course"
  | "skill"
  | "certification"
  | "idea"
  | "goal";

export interface SearchResult {
  type: SearchResultType;
  id: number;
  title: string;
  subtitle?: string;
  /** Route to navigate to when the result is chosen. */
  route: string;
}

type Searcher = (needle: string) => Promise<SearchResult[]>;

const searchers: Record<SearchResultType, Searcher> = {
  task: async (needle) =>
    (await db.tasks.filter((t) => !t.archived && t.title.toLowerCase().includes(needle)).limit(25).toArray()).map(
      (t) => ({ type: "task", id: t.id!, title: t.title, subtitle: t.program, route: "/tasks" }),
    ),

  assignment: async (needle) =>
    (
      await db.assignments
        .filter((a) => !a.archived && a.title.toLowerCase().includes(needle))
        .limit(25)
        .toArray()
    ).map((a) => ({
      type: "assignment",
      id: a.id!,
      title: a.title,
      subtitle: a.program,
      route: "/assignments",
    })),

  project: async (needle) =>
    (
      await db.projects.filter((p) => !p.archived && p.name.toLowerCase().includes(needle)).limit(25).toArray()
    ).map((p) => ({ type: "project", id: p.id!, title: p.name, subtitle: p.status, route: "/projects" })),

  projectTask: async (needle) =>
    (
      await db.projectTasks.filter((t) => !t.archived && t.title.toLowerCase().includes(needle)).limit(25).toArray()
    ).map((t) => ({
      type: "projectTask",
      id: t.id!,
      title: t.title,
      subtitle: "Project task",
      route: `/project-tasks?projectId=${t.projectId}`,
    })),

  event: async (needle) =>
    (
      await db.events.filter((e) => !e.archived && e.title.toLowerCase().includes(needle)).limit(25).toArray()
    ).map((e) => ({ type: "event", id: e.id!, title: e.title, subtitle: e.kind, route: "/calendar" })),

  note: async (needle) =>
    (
      await db.notes
        .filter(
          (n) =>
            !n.archived &&
            (n.title.toLowerCase().includes(needle) || n.body.toLowerCase().includes(needle)),
        )
        .limit(25)
        .toArray()
    ).map((n) => ({ type: "note", id: n.id!, title: n.title, subtitle: n.category, route: "/knowledge" })),

  course: async (needle) =>
    (
      await db.courses
        .filter((c) => c.name.toLowerCase().includes(needle) || c.code.toLowerCase().includes(needle))
        .limit(25)
        .toArray()
    ).map((c) => ({ type: "course", id: c.id!, title: c.name, subtitle: c.code, route: "/academic" })),

  skill: async (needle) =>
    (await db.skills.filter((s) => !s.archived && s.name.toLowerCase().includes(needle)).limit(25).toArray()).map(
      (s) => ({ type: "skill", id: s.id!, title: s.name, subtitle: s.category, route: "/career" }),
    ),

  certification: async (needle) =>
    (
      await db.certifications
        .filter((c) => !c.archived && c.name.toLowerCase().includes(needle))
        .limit(25)
        .toArray()
    ).map((c) => ({
      type: "certification",
      id: c.id!,
      title: c.name,
      subtitle: c.provider,
      route: "/career",
    })),

  idea: async (needle) =>
    (await db.ideas.filter((i) => !i.archived && i.title.toLowerCase().includes(needle)).limit(25).toArray()).map(
      (i) => ({ type: "idea", id: i.id!, title: i.title, subtitle: i.category, route: "/ideas" }),
    ),

  goal: async (needle) =>
    (await db.goals.filter((g) => !g.archived && g.title.toLowerCase().includes(needle)).limit(25).toArray()).map(
      (g) => ({ type: "goal", id: g.id!, title: g.title, subtitle: g.status, route: "/goals" }),
    ),
};

export const SearchService = {
  /**
   * Search everything, or a subset via `types`. Case-insensitive substring
   * match today — swappable later for an index (e.g. FlexSearch/MiniSearch)
   * or an AI-backed semantic search behind this same function signature.
   */
  async search(
    query: string,
    types: SearchResultType[] = Object.keys(searchers) as SearchResultType[],
  ): Promise<SearchResult[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const results = await Promise.all(types.map((t) => searchers[t](needle)));
    return results.flat();
  },
};
