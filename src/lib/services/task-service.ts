import { db, type Task, type ProgramType, type EntityId, withDb } from "@/lib/db";
import { createBaseService } from "./base-service";

const base = createBaseService<Task>("tasks");

export const TaskService = {
  ...base,

  /** Active (non-archived) tasks for one program — powers the Tasks board columns. */
  async listByProgram(program: ProgramType): Promise<Task[]> {
    return withDb("tasks", "list by program", () =>
      db.tasks
        .filter((t) => !t.archived && t.program === program)
        .toArray(),
    );
  },

  /** Sub-tasks of a given task (parentTaskId linking). */
  async listChildren(parentTaskId: EntityId): Promise<Task[]> {
    return withDb("tasks", "list children", () =>
      db.tasks.where("parentTaskId").equals(parentTaskId).toArray(),
    );
  },

  /** Tasks linked to a course, project, or assignment — cross-module lookups. */
  async listByCourse(courseId: EntityId): Promise<Task[]> {
    return withDb("tasks", "list by course", () =>
      db.tasks.where("courseId").equals(courseId).toArray(),
    );
  },
  async listByProject(projectId: EntityId): Promise<Task[]> {
    return withDb("tasks", "list by project", () =>
      db.tasks.where("projectId").equals(projectId).toArray(),
    );
  },

  /** Tasks due within the next N days (not done, not archived). Used by dashboards/reminders. */
  async listDueSoon(days = 7): Promise<Task[]> {
    const cutoff = Date.now() + days * 24 * 60 * 60 * 1000;
    return withDb("tasks", "list due soon", () =>
      db.tasks
        .filter(
          (t) =>
            !t.archived &&
            t.status !== "done" &&
            typeof t.dueDate === "number" &&
            t.dueDate <= cutoff,
        )
        .toArray(),
    );
  },

  async setStatus(id: EntityId, status: Task["status"]): Promise<number> {
    return base.update(id, { status });
  },
};
