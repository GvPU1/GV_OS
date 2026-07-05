import { db, type CalendarEvent, type EntityId, withDb } from "@/lib/db";
import { createBaseService } from "./base-service";

const base = createBaseService<CalendarEvent>("events");

export const CalendarService = {
  ...base,

  /** Events starting within [start, end), inclusive of start. Powers month/week views. */
  async listBetween(start: number, end: number): Promise<CalendarEvent[]> {
    return withDb("events", "list between", () =>
      db.events
        .filter((e) => !e.archived && e.start >= start && e.start < end)
        .toArray(),
    );
  },

  async listUpcoming(days = 7): Promise<CalendarEvent[]> {
    const now = Date.now();
    return this.listBetween(now, now + days * 24 * 60 * 60 * 1000);
  },

  async listForTask(taskId: EntityId): Promise<CalendarEvent[]> {
    return withDb("events", "list for task", () =>
      db.events.where("taskId").equals(taskId).toArray(),
    );
  },
  async listForProject(projectId: EntityId): Promise<CalendarEvent[]> {
    return withDb("events", "list for project", () =>
      db.events.where("projectId").equals(projectId).toArray(),
    );
  },
  async listForAssignment(assignmentId: EntityId): Promise<CalendarEvent[]> {
    return withDb("events", "list for assignment", () =>
      db.events.where("assignmentId").equals(assignmentId).toArray(),
    );
  },
};
