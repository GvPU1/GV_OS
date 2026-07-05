import { db, type Note, type EntityId, withDb } from "@/lib/db";
import { createBaseService } from "./base-service";

const base = createBaseService<Note>("notes");

export const NotesService = {
  ...base,

  /** Non-archived notes, newest-updated first — matches the Knowledge page today. */
  async listActiveSorted(): Promise<Note[]> {
    return withDb("notes", "list active sorted", () =>
      db.notes.filter((n) => !n.archived).reverse().sortBy("updatedAt"),
    );
  },

  async listByCategory(category: string): Promise<Note[]> {
    return withDb("notes", "list by category", () =>
      db.notes.where("category").equals(category).toArray(),
    );
  },

  /** Simple client-side substring search over title + body. Swappable later
   *  for a full-text/AI-backed implementation without changing callers. */
  async search(query: string): Promise<Note[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) return this.listActiveSorted();
    return withDb("notes", "search", async () => {
      const notes = await db.notes.filter((n) => !n.archived).toArray();
      return notes.filter(
        (n) =>
          n.title.toLowerCase().includes(needle) || n.body.toLowerCase().includes(needle),
      );
    });
  },

  async listForTask(taskId: EntityId): Promise<Note[]> {
    return withDb("notes", "list for task", () =>
      db.notes.where("taskId").equals(taskId).toArray(),
    );
  },
  async listForProject(projectId: EntityId): Promise<Note[]> {
    return withDb("notes", "list for project", () =>
      db.notes.where("projectId").equals(projectId).toArray(),
    );
  },
  async listForCourse(courseId: EntityId): Promise<Note[]> {
    return withDb("notes", "list for course", () =>
      db.notes.where("courseId").equals(courseId).toArray(),
    );
  },
};
