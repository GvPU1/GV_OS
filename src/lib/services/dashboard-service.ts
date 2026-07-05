import { db, withDb } from "@/lib/db";
import { AssignmentService } from "./assignment-service";
import { TaskService } from "./task-service";
import { CalendarService } from "./calendar-service";

export interface DashboardStats {
  tasks: { total: number; open: number; dueSoon: number };
  assignments: { total: number; open: number; overdue: number; upcoming: number };
  projects: { total: number; active: number };
  notes: { total: number };
  ideas: { total: number };
  skills: { total: number };
  certifications: { total: number };
  upcomingEvents: number;
}

/**
 * Read-only aggregate view used by the home/dashboard page. Composes the
 * other services rather than querying Dexie directly, so it automatically
 * stays correct as domain services evolve (and is the natural place for a
 * future AI assistant to pull a "what does my week look like" summary
 * from, instead of reaching into IndexedDB itself).
 */
export const DashboardService = {
  async getStats(): Promise<DashboardStats> {
    const [tasks, dueSoonTasks, assignments, overdueAssignments, upcomingAssignments, projects, notesCount, ideasCount, skillsCount, certsCount, upcomingEvents] =
      await Promise.all([
        TaskService.list(),
        TaskService.listDueSoon(7),
        AssignmentService.list(),
        AssignmentService.listOverdue(),
        AssignmentService.listUpcoming(7),
        withDb("projects", "list", () => db.projects.toArray()),
        withDb("notes", "count", () => db.notes.count()),
        withDb("ideas", "count", () => db.ideas.count()),
        withDb("skills", "count", () => db.skills.count()),
        withDb("certifications", "count", () => db.certifications.count()),
        CalendarService.listUpcoming(7),
      ]);

    return {
      tasks: {
        total: tasks.length,
        open: tasks.filter((t) => !t.archived && t.status !== "done").length,
        dueSoon: dueSoonTasks.length,
      },
      assignments: {
        total: assignments.length,
        open: assignments.filter(
          (a) => !a.archived && a.status !== "submitted" && a.status !== "completed",
        ).length,
        overdue: overdueAssignments.length,
        upcoming: upcomingAssignments.length,
      },
      projects: {
        total: projects.length,
        active: projects.filter((p) => !p.archived && p.status === "active").length,
      },
      notes: { total: notesCount },
      ideas: { total: ideasCount },
      skills: { total: skillsCount },
      certifications: { total: certsCount },
      upcomingEvents: upcomingEvents.length,
    };
  },
};
