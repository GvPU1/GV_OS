import {
  db,
  type Assignment,
  type AcademicProgram,
  type EntityId,
  withDb,
} from "@/lib/db";
import { createBaseService } from "./base-service";

const base = createBaseService<Assignment>("assignments");

export const AssignmentService = {
  ...base,

  async listByProgram(program: AcademicProgram): Promise<Assignment[]> {
    return withDb("assignments", "list by program", () =>
      db.assignments
        .filter((a) => !a.archived && a.program === program)
        .toArray(),
    );
  },

  async listByCourse(courseId: EntityId): Promise<Assignment[]> {
    return withDb("assignments", "list by course", () =>
      db.assignments.where("courseId").equals(courseId).toArray(),
    );
  },

  /** Not submitted/completed and past their deadline. */
  async listOverdue(): Promise<Assignment[]> {
    const now = Date.now();
    return withDb("assignments", "list overdue", () =>
      db.assignments
        .filter(
          (a) =>
            !a.archived &&
            a.status !== "submitted" &&
            a.status !== "completed" &&
            typeof a.deadline === "number" &&
            a.deadline < now,
        )
        .toArray(),
    );
  },

  async listUpcoming(days = 7): Promise<Assignment[]> {
    const now = Date.now();
    const cutoff = now + days * 24 * 60 * 60 * 1000;
    return withDb("assignments", "list upcoming", () =>
      db.assignments
        .filter(
          (a) =>
            !a.archived &&
            a.status !== "submitted" &&
            a.status !== "completed" &&
            typeof a.deadline === "number" &&
            a.deadline >= now &&
            a.deadline <= cutoff,
        )
        .toArray(),
    );
  },

  async setStatus(id: EntityId, status: Assignment["status"]): Promise<number> {
    return base.update(id, { status });
  },
};
