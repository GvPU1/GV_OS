/**
 * GV OS — Database Layer
 * ────────────────────────────────────────────────────────────────────────
 * Dexie (IndexedDB) wrapper for the whole app.
 *
 * MIGRATION NOTE (read before editing):
 * This file replaces `db.js` 1:1. The exported `db` singleton, table names,
 * and every `version(n).stores(...)` call below are IDENTICAL to the
 * previous JS version for versions 1–3. Nothing about how existing data is
 * read from IndexedDB has changed — this is a typing/structure pass only.
 *
 * `version(4)` is new. It only *adds* indexes (title/updatedAt/relations/
 * soft-delete flags) to tables that already exist. Dexie upgrades indexes
 * in place without touching row data, so this is safe for existing
 * installs — no data migration, no ID changes, nothing destructive.
 *
 * Existing numeric auto-increment IDs are untouched. The `EntityId` type
 * below is a documented seam for a *future* move to UUIDs — it currently
 * resolves to `number` so nothing downstream needs to change yet.
 */
import Dexie, { type Table } from "dexie";

/* ────────────────────────────────────────────────────────────────────────
 * ID / base shape
 * ──────────────────────────────────────────────────────────────────── */

/**
 * Primary key type for every table. Today this is Dexie's auto-increment
 * `number`. When GV OS eventually migrates to UUIDs, this becomes
 * `string` and (thanks to every table typing its `id` as `EntityId`) the
 * blast radius of that change is contained to this one line plus a data
 * migration script — not a signature change across the whole codebase.
 */
export type EntityId = number;

/**
 * Fields every table conceptually supports. Not every table has all of
 * these wired up to the UI yet, but the shape is here so services can rely
 * on it consistently (e.g. a generic `softDelete()` helper).
 *
 * - `createdAt` — always set on insert.
 * - `updatedAt` — set on every mutation (some legacy call sites still skip
 *   it on first insert; treat as optional everywhere it's read).
 * - `archived`  — soft "hide from active views", used today by most tables.
 * - `deleted` / `deletedAt` — soft-delete seam for a future trash/undo and
 *   sync system. Not used by any UI yet; safe to ignore until then.
 */
export interface BaseRecord {
  id?: EntityId;
  createdAt: number;
  updatedAt?: number;
  archived?: boolean;
  deleted?: boolean;
  deletedAt?: number;
}

/* ────────────────────────────────────────────────────────────────────────
 * Enum-like value maps
 * ────────────────────────────────────────────────────────────────────────
 * Plain `as const` objects rather than TS `enum`s on purpose: existing
 * .jsx call sites pass raw string literals ("todo", "high", ...) and are
 * not type-checked, so real `enum` members (which are nominally typed and
 * would reject those raw strings) would be friction for no benefit here.
 * These give the same call-site ergonomics (`TaskStatus.Done`) plus a
 * derived union type, while staying structurally compatible with plain
 * strings already stored in IndexedDB.
 * ──────────────────────────────────────────────────────────────────── */

export const Program = {
  BTech: "btech",
  BS: "bs",
  Personal: "personal",
} as const;
export type ProgramType = (typeof Program)[keyof typeof Program];

/** Courses / semesters / assignments only ever use the two academic programs. */
export type AcademicProgram = typeof Program.BTech | typeof Program.BS;

export const Priority = {
  Low: "low",
  Medium: "medium",
  High: "high",
  Critical: "critical",
} as const;
export type PriorityType = (typeof Priority)[keyof typeof Priority];
/** Ideas only offer low/medium/high (no "critical") in the current UI. */
export type IdeaPriorityType = typeof Priority.Low | typeof Priority.Medium | typeof Priority.High;

export const TaskStatus = {
  Todo: "todo",
  InProgress: "in_progress",
  Done: "done",
  Deferred: "deferred",
} as const;
export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

export const AssignmentStatus = {
  NotStarted: "not_started",
  InProgress: "in_progress",
  Submitted: "submitted",
  Completed: "completed",
} as const;
export type AssignmentStatusType = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const ProjectStatus = {
  Planned: "planned",
  Active: "active",
  OnHold: "on_hold",
  Completed: "completed",
  Cancelled: "cancelled",
} as const;
export type ProjectStatusType = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const ProjectTaskStatus = {
  Backlog: "backlog",
  Planned: "planned",
  InProgress: "in_progress",
  Review: "review",
  Testing: "testing",
  Done: "done",
  Blocked: "blocked",
  Cancelled: "cancelled",
} as const;
export type ProjectTaskStatusType = (typeof ProjectTaskStatus)[keyof typeof ProjectTaskStatus];

export const EventKind = {
  Personal: "personal",
  Academic: "academic",
} as const;
export type EventKindType = (typeof EventKind)[keyof typeof EventKind];

export const SkillLevel = {
  Beginner: "beginner",
  Intermediate: "intermediate",
  Advanced: "advanced",
  Expert: "expert",
} as const;
export type SkillLevelType = (typeof SkillLevel)[keyof typeof SkillLevel];

export const CertificationStatus = {
  Planned: "planned",
  InProgress: "in_progress",
  Scheduled: "scheduled",
  Completed: "completed",
  Expired: "expired",
} as const;
export type CertificationStatusType = (typeof CertificationStatus)[keyof typeof CertificationStatus];

export const IdeaStatus = {
  Captured: "captured",
  Evaluating: "evaluating",
  Planned: "planned",
  Active: "active",
  Complete: "complete",
} as const;
export type IdeaStatusType = (typeof IdeaStatus)[keyof typeof IdeaStatus];

/** Grade letters used by the CGPA calculator in the academic module. */
export type Grade = "S" | "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C" | "D" | "E" | "F";

/* ────────────────────────────────────────────────────────────────────────
 * Table row interfaces
 * ────────────────────────────────────────────────────────────────────────
 * Every interface below matches the fields already read/written across the
 * app today (routes/*.jsx, components/*-dialog.jsx). Relationship fields
 * requested for future cross-module linking (courseId, projectId,
 * parentTaskId, etc.) are added as OPTIONAL so existing records — which
 * don't have them — remain perfectly valid.
 * ──────────────────────────────────────────────────────────────────── */

export interface Semester extends BaseRecord {
  program: AcademicProgram;
  number: number;
  name?: string;
}

export interface Course extends BaseRecord {
  program: AcademicProgram;
  code: string;
  name: string;
  credits: number;
  /** Denormalized semester number, kept alongside semesterId for legacy display. */
  semester: number;
  semesterId?: EntityId;
  grade?: Grade;
}

export interface Task extends BaseRecord {
  title: string;
  description?: string;
  notes?: string;
  program: ProgramType;
  priority: PriorityType;
  status: TaskStatusType;
  dueDate?: number;
  tags?: string[];
  // Cross-module linking (optional — populated by future features).
  courseId?: EntityId;
  projectId?: EntityId;
  assignmentId?: EntityId;
  parentTaskId?: EntityId;
}

export interface Assignment extends BaseRecord {
  title: string;
  description?: string;
  notes?: string;
  program: AcademicProgram;
  courseId?: EntityId;
  priority: PriorityType;
  status: AssignmentStatusType;
  deadline?: number;
  // Cross-module linking.
  semesterId?: EntityId;
  taskId?: EntityId;
  eventId?: EntityId;
}

export interface Project extends BaseRecord {
  name: string;
  description?: string;
  category?: string;
  status: ProjectStatusType;
  priority: PriorityType;
  progress: number;
  startDate?: number;
  deadline?: number;
  // Cross-module linking.
  parentProjectId?: EntityId;
}

export interface ProjectTask extends BaseRecord {
  title: string;
  description?: string;
  priority: PriorityType;
  status: ProjectTaskStatusType;
  dueDate?: number;
  projectId: EntityId;
  labels?: string[];
  estimateHours?: number;
  // Cross-module linking.
  parentTaskId?: EntityId;
}

export interface CalendarEvent extends BaseRecord {
  title: string;
  start: number;
  kind: EventKindType;
  notes?: string;
  // Cross-module linking.
  taskId?: EntityId;
  projectId?: EntityId;
  assignmentId?: EntityId;
  courseId?: EntityId;
}

export interface Note extends BaseRecord {
  title: string;
  body: string;
  tags?: string[];
  category?: string;
  // Cross-module linking.
  taskId?: EntityId;
  projectId?: EntityId;
  courseId?: EntityId;
  assignmentId?: EntityId;
  eventId?: EntityId;
}

/** Reserved for the study-timer persistence layer (StudyService); not yet
 *  written to by the UI — the Pomodoro timer in `lib/timer.js` is
 *  in-memory only today. Shape is forward-looking. */
export interface StudySession extends BaseRecord {
  startedAt: number;
  endedAt?: number;
  mode: "25_5" | "52_17" | "custom";
  durationMinutes?: number;
  completed?: boolean;
  // Cross-module linking.
  courseId?: EntityId;
  taskId?: EntityId;
  assignmentId?: EntityId;
}

export interface Skill extends BaseRecord {
  name: string;
  category: string;
  currentLevel: SkillLevelType;
  targetLevel: SkillLevelType;
  notes?: string;
}

export interface Certification extends BaseRecord {
  name: string;
  provider: string;
  status: CertificationStatusType;
  url?: string;
  notes?: string;
}

export interface Idea extends BaseRecord {
  title: string;
  description?: string;
  category: string;
  priority: IdeaPriorityType;
  status: IdeaStatusType;
}

/**
 * New tables, added for GoalService / ReminderService. No existing route or
 * component references `db.goals` or `db.reminders` today — these are
 * pure additive infrastructure (empty tables until UI is built on top),
 * requested explicitly for future goal-tracking and reminder features and
 * for the AI-readiness "Goals" surface. Adding a brand-new table is always
 * non-destructive in Dexie: it can't collide with or affect existing data.
 */
export const GoalStatus = {
  NotStarted: "not_started",
  InProgress: "in_progress",
  Achieved: "achieved",
  Abandoned: "abandoned",
} as const;
export type GoalStatusType = (typeof GoalStatus)[keyof typeof GoalStatus];

export interface Goal extends BaseRecord {
  title: string;
  description?: string;
  category?: string;
  priority: PriorityType;
  status: GoalStatusType;
  targetDate?: number;
  progress?: number;
  // Cross-module linking.
  projectId?: EntityId;
  courseId?: EntityId;
  skillId?: EntityId;
  parentGoalId?: EntityId;
}

export interface Reminder extends BaseRecord {
  title: string;
  notes?: string;
  remindAt: number;
  dismissed?: boolean;
  // Cross-module linking — a reminder is usually "about" something else.
  taskId?: EntityId;
  assignmentId?: EntityId;
  eventId?: EntityId;
  projectId?: EntityId;
  goalId?: EntityId;
}

/* ────────────────────────────────────────────────────────────────────────
 * Dexie database
 * ──────────────────────────────────────────────────────────────────── */

class GVDatabase extends Dexie {
  courses!: Table<Course, EntityId>;
  semesters!: Table<Semester, EntityId>;
  tasks!: Table<Task, EntityId>;
  assignments!: Table<Assignment, EntityId>;
  projects!: Table<Project, EntityId>;
  projectTasks!: Table<ProjectTask, EntityId>;
  events!: Table<CalendarEvent, EntityId>;
  notes!: Table<Note, EntityId>;
  sessions!: Table<StudySession, EntityId>;
  skills!: Table<Skill, EntityId>;
  certifications!: Table<Certification, EntityId>;
  ideas!: Table<Idea, EntityId>;
  goals!: Table<Goal, EntityId>;
  reminders!: Table<Reminder, EntityId>;

  constructor() {
    super("gv-os");

    // ── Versions 1–3 are byte-for-byte identical to the previous db.js.
    // Do not edit these — they describe the schema of data that already
    // exists on disk for every current install.
    this.version(1).stores({
      courses: "++id, program, semester, code",
      tasks: "++id, program, status, priority, dueDate, archived",
      assignments: "++id, program, courseId, status, priority, deadline, archived",
      projects: "++id, status, priority, deadline, archived",
      projectTasks: "++id, projectId, status, dueDate",
      events: "++id, start, kind, archived",
      notes: "++id, category, archived",
      sessions: "++id, startedAt, mode",
    });
    this.version(2).stores({
      semesters: "++id, program, number",
      courses: "++id, program, semester, semesterId, code",
    });
    this.version(3).stores({
      skills: "++id, name, category, archived",
      certifications: "++id, name, provider, status, archived",
      ideas: "++id, title, category, status, priority, archived",
    });

    // ── Version 4 (new): additive indexes only.
    // Adds `title`/`updatedAt` (sorting + future search), the new
    // relationship columns, and `deleted` (future soft-delete/sync) to
    // tables that need them. Dexie rebuilds only the index entries for
    // whatever's new here — existing rows and existing indexes are
    // untouched, so this is safe to ship without any data migration.
    this.version(4).stores({
      tasks:
        "++id, program, status, priority, dueDate, archived, title, updatedAt, deleted, courseId, projectId, assignmentId, parentTaskId",
      assignments:
        "++id, program, courseId, status, priority, deadline, archived, title, updatedAt, deleted, semesterId, taskId",
      projects:
        "++id, status, priority, deadline, archived, title, updatedAt, deleted, category, parentProjectId",
      projectTasks:
        "++id, projectId, status, dueDate, title, updatedAt, deleted, priority, parentTaskId",
      events:
        "++id, start, kind, archived, title, updatedAt, deleted, taskId, projectId, assignmentId, courseId",
      notes:
        "++id, category, archived, title, updatedAt, deleted, *tags, taskId, projectId, courseId, assignmentId",
      sessions: "++id, startedAt, mode, updatedAt, courseId, taskId, assignmentId",
      skills: "++id, name, category, archived, updatedAt, deleted",
      certifications: "++id, name, provider, status, archived, updatedAt, deleted",
      ideas: "++id, title, category, status, priority, archived, updatedAt, deleted",
      courses: "++id, program, semester, semesterId, code, name, updatedAt, deleted",
      semesters: "++id, program, number, updatedAt, deleted",
      // Brand-new tables — no prior version to carry forward, so declared
      // fresh here. Empty until a future feature writes to them.
      goals:
        "++id, status, priority, category, targetDate, archived, deleted, updatedAt, projectId, courseId, skillId, parentGoalId",
      reminders:
        "++id, remindAt, dismissed, archived, deleted, updatedAt, taskId, assignmentId, eventId, projectId, goalId",
    });
  }
}

export const db = new GVDatabase();

/** Every table name, useful for iteration (backup/export, universal search, etc). */
export const TABLE_NAMES = [
  "courses",
  "semesters",
  "tasks",
  "assignments",
  "projects",
  "projectTasks",
  "events",
  "notes",
  "sessions",
  "skills",
  "certifications",
  "ideas",
  "goals",
  "reminders",
] as const;
export type TableName = (typeof TABLE_NAMES)[number];

/* ────────────────────────────────────────────────────────────────────────
 * Reusable database helpers
 * ────────────────────────────────────────────────────────────────────────
 * Small, generic, table-agnostic helpers that the service layer (see
 * src/lib/services/) builds on top of, so every service gets consistent
 * timestamping, error handling, and soft-delete/-archive behavior for
 * free instead of re-implementing it per table.
 * ──────────────────────────────────────────────────────────────────── */

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly table: TableName,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

function friendlyMessage(operation: string, table: TableName): string {
  return `Couldn't ${operation} ${table}. Your data is safe — please try again.`;
}

/**
 * Wraps a Dexie operation with logging + a typed, user-friendly error.
 * Every service method should go through this instead of calling Dexie
 * directly, so failures are consistent and never silent.
 */
export async function withDb<T>(
  table: TableName,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (cause) {
    console.error(`[db:${table}] ${operation} failed`, cause);
    throw new DatabaseError(friendlyMessage(operation, table), operation, table, cause);
  }
}

/** Insert with `createdAt` (and `updatedAt`) stamped automatically. */
export async function createRecord<T extends BaseRecord>(
  table: TableName,
  dexieTable: Table<T, EntityId>,
  data: Omit<T, "id" | "createdAt" | "updatedAt">,
): Promise<EntityId> {
  return withDb(table, "create", () => {
    const now = Date.now();
    const record = { ...data, createdAt: now, updatedAt: now } as unknown as T;
    return dexieTable.add(record);
  });
}

/** Patch a record, always bumping `updatedAt`. */
export async function updateRecord<T extends BaseRecord>(
  table: TableName,
  dexieTable: Table<T, EntityId>,
  id: EntityId,
  patch: Partial<Omit<T, "id" | "createdAt">>,
): Promise<number> {
  return withDb(table, "update", () =>
    dexieTable.update(id, { ...patch, updatedAt: Date.now() } as Partial<T>),
  );
}

/** Soft-archive (hide from active views, keep the row). */
export async function archiveRecord<T extends BaseRecord>(
  table: TableName,
  dexieTable: Table<T, EntityId>,
  id: EntityId,
): Promise<number> {
  return withDb(table, "archive", () =>
    dexieTable.update(id, { archived: true, updatedAt: Date.now() } as Partial<T>),
  );
}

/** Reverse of archiveRecord. */
export async function unarchiveRecord<T extends BaseRecord>(
  table: TableName,
  dexieTable: Table<T, EntityId>,
  id: EntityId,
): Promise<number> {
  return withDb(table, "unarchive", () =>
    dexieTable.update(id, { archived: false, updatedAt: Date.now() } as Partial<T>),
  );
}

/**
 * Soft-delete seam for a future trash/undo + sync system. Not used by any
 * UI yet — current delete buttons call `hardDelete` (which is exactly
 * today's `db.table.delete(id)` behavior, unchanged).
 */
export async function softDelete<T extends BaseRecord>(
  table: TableName,
  dexieTable: Table<T, EntityId>,
  id: EntityId,
): Promise<number> {
  return withDb(table, "soft-delete", () =>
    dexieTable.update(id, { deleted: true, deletedAt: Date.now() } as Partial<T>),
  );
}

/** Permanently remove a row. This is what every current "Delete" action does. */
export async function hardDelete<T extends BaseRecord>(
  table: TableName,
  dexieTable: Table<T, EntityId>,
  id: EntityId,
): Promise<void> {
  return withDb(table, "delete", () => dexieTable.delete(id));
}

/**
 * Full local JSON export across every table — the building block for the
 * future manual/daily/weekly backup system. Safe to call today for a
 * one-off "export my data" action.
 */
export async function exportAllData(): Promise<Record<TableName, unknown[]>> {
  return withDb("tasks" /* representative — export touches all tables */, "export", async () => {
    const entries = await Promise.all(
      TABLE_NAMES.map(async (name) => [name, await (db[name] as Table).toArray()] as const),
    );
    return Object.fromEntries(entries) as Record<TableName, unknown[]>;
  });
}
