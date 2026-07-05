import { db, type Goal, type GoalStatusType, type EntityId, withDb } from "@/lib/db";
import { createBaseService } from "./base-service";

const base = createBaseService<Goal>("goals");

/**
 * No UI reads/writes `db.goals` yet — this table is empty on every install
 * until a Goals feature is built. The service exists now so that feature
 * (and the dashboard/AI surfaces that will want to reference goals) can be
 * added later without touching the database layer again.
 */
export const GoalService = {
  ...base,

  async listByStatus(status: GoalStatusType): Promise<Goal[]> {
    return withDb("goals", "list by status", () =>
      db.goals.filter((g) => !g.archived && g.status === status).toArray(),
    );
  },

  async listForProject(projectId: EntityId): Promise<Goal[]> {
    return withDb("goals", "list for project", () =>
      db.goals.where("projectId").equals(projectId).toArray(),
    );
  },

  async listSubGoals(parentGoalId: EntityId): Promise<Goal[]> {
    return withDb("goals", "list sub-goals", () =>
      db.goals.where("parentGoalId").equals(parentGoalId).toArray(),
    );
  },
};
