import {
  db,
  type StudySession,
  type Course,
  type Semester,
  type AcademicProgram,
  type EntityId,
  withDb,
} from "@/lib/db";
import { createBaseService } from "./base-service";

const sessionBase = createBaseService<StudySession>("sessions");
const courseBase = createBaseService<Course>("courses");
const semesterBase = createBaseService<Semester>("semesters");

/**
 * Covers both the Pomodoro/study-session log (currently in-memory only —
 * see `lib/timer.js`) and the academic structure (courses/semesters) it
 * relates to. Grouping them here mirrors how the "Study" and "Academic"
 * pages are conceptually linked, without requiring the timer store itself
 * to change yet.
 */
export const StudyService = {
  sessions: {
    ...sessionBase,

    async logSession(input: {
      startedAt: number;
      endedAt: number;
      mode: StudySession["mode"];
      courseId?: EntityId;
      taskId?: EntityId;
    }): Promise<EntityId> {
      const durationMinutes = Math.round((input.endedAt - input.startedAt) / 60000);
      return sessionBase.create({
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        mode: input.mode,
        durationMinutes,
        completed: true,
        courseId: input.courseId,
        taskId: input.taskId,
      });
    },

    async listByCourse(courseId: EntityId): Promise<StudySession[]> {
      return withDb("sessions", "list by course", () =>
        db.sessions.where("courseId").equals(courseId).toArray(),
      );
    },

    /** Total focused minutes logged since `since` (defaults to all-time). */
    async totalMinutes(since = 0): Promise<number> {
      return withDb("sessions", "total minutes", async () => {
        const sessions = await db.sessions
          .filter((s) => s.startedAt >= since && !!s.completed)
          .toArray();
        return sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      });
    },
  },

  courses: {
    ...courseBase,

    async listByProgram(program: AcademicProgram): Promise<Course[]> {
      return withDb("courses", "list by program", () =>
        db.courses.where("program").equals(program).toArray(),
      );
    },
    async listBySemester(semesterId: EntityId): Promise<Course[]> {
      return withDb("courses", "list by semester", () =>
        db.courses.where("semesterId").equals(semesterId).toArray(),
      );
    },
  },

  semesters: {
    ...semesterBase,

    async listByProgram(program: AcademicProgram): Promise<Semester[]> {
      return withDb("semesters", "list by program", () =>
        db.semesters.where("program").equals(program).sortBy("number"),
      );
    },
  },
};
