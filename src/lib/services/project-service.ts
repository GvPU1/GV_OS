import { db, type Project, type ProjectTask, type EntityId, withDb } from "@/lib/db";
import { createBaseService } from "./base-service";

const base = createBaseService<Project>("projects");
const taskBase = createBaseService<ProjectTask>("projectTasks");

export const ProjectService = {
  ...base,

  async listSubProjects(parentProjectId: EntityId): Promise<Project[]> {
    return withDb("projects", "list sub-projects", () =>
      db.projects.where("parentProjectId").equals(parentProjectId).toArray(),
    );
  },

  /** Recompute `progress` (0–100) for a project from the completion of its tasks. */
  async recomputeProgress(projectId: EntityId): Promise<number> {
    return withDb("projects", "recompute progress", async () => {
      const tasks = await db.projectTasks.where("projectId").equals(projectId).toArray();
      const progress =
        tasks.length === 0
          ? 0
          : Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100);
      await db.projects.update(projectId, { progress, updatedAt: Date.now() });
      return progress;
    });
  },

  tasks: {
    ...taskBase,

    async listByProject(projectId: EntityId): Promise<ProjectTask[]> {
      return withDb("projectTasks", "list by project", () =>
        db.projectTasks.where("projectId").equals(projectId).toArray(),
      );
    },

    async listChildren(parentTaskId: EntityId): Promise<ProjectTask[]> {
      return withDb("projectTasks", "list children", () =>
        db.projectTasks.where("parentTaskId").equals(parentTaskId).toArray(),
      );
    },

    async setStatus(id: EntityId, status: ProjectTask["status"]): Promise<number> {
      const updated = await taskBase.update(id, { status });
      const task = await taskBase.get(id);
      if (task) await ProjectService.recomputeProgress(task.projectId);
      return updated;
    },
  },
};
