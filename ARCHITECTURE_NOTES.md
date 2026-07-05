# GV OS — Architecture Refactor: Phase 1 (Database + Services)

This is the first of several planned phases toward the production-quality
architecture described in the brief. It touches **only** the database layer
and adds a new, additive service layer — **no existing route, component, or
workflow was modified.** Every current page behaves exactly as before.

## What changed

### 1. `src/lib/db.js` → `src/lib/db.ts`
- Same Dexie instance, same database name (`gv-os`), same table names.
- **Versions 1–3 are byte-for-byte identical** to the old file — this is
  the schema your existing IndexedDB data was created under, so it's left
  untouched.
- **Version 4 is new** and only *adds indexes* (`title`, `updatedAt`,
  `deleted`, and the new relationship columns below) to existing tables,
  plus two brand-new empty tables (`goals`, `reminders`). Adding indexes to
  an existing Dexie table rebuilds only the index entries, not the data —
  this is safe and won't touch or lose anything already saved.
- Full TypeScript interfaces for every table (`Task`, `Assignment`,
  `Project`, `ProjectTask`, `CalendarEvent`, `Note`, `StudySession`,
  `Skill`, `Certification`, `Idea`, `Course`, `Semester`, `Goal`,
  `Reminder`), all extending a shared `BaseRecord` with
  `id / createdAt / updatedAt / archived / deleted / deletedAt`.
- "Enum-like" `as const` value maps (`TaskStatus`, `Priority`, `Program`,
  etc.) instead of real TS `enum`s — real enums are nominally typed and
  would reject the plain string literals your existing `.jsx` dialogs
  already pass around; these give the same `TaskStatus.Done`-style
  ergonomics while staying structurally compatible.
- New optional cross-module relationship fields (`courseId`, `projectId`,
  `assignmentId`, `parentTaskId`, `parentProjectId`, `taskId`, `noteId`,
  `eventId`, etc.) on the relevant tables, all optional so existing rows
  (which don't have them) remain valid.
- `EntityId` type alias (`= number` today) as the documented seam for a
  future UUID migration — not migrated yet, per the brief.
- Reusable, table-agnostic helpers: `withDb`, `createRecord`,
  `updateRecord`, `archiveRecord`, `unarchiveRecord`, `softDelete`,
  `hardDelete`, `exportAllData`. Every one wraps its Dexie call in
  try/catch, logs the failure, and throws a typed `DatabaseError` with a
  friendly message — no more silent failures.
- `jsconfig.json` now also includes `src/**/*.ts`/`.tsx` so the `@/*` path
  alias keeps resolving for the new files (no tooling change needed —
  Vite/esbuild already compiles `.ts` out of the box).

**No component changes were required for this step** — every existing file
does `import { db } from "@/lib/db"`, and `db` is exported with the exact
same shape as before.

### 2. New service layer (`src/lib/services/`)
Additive only — nothing currently imports these yet, so there is zero risk
to existing behavior. Each service wraps its table(s) in `withDb`-backed,
typed methods:

| Service | Wraps |
|---|---|
| `TaskService` | `tasks` |
| `AssignmentService` | `assignments` |
| `ProjectService` (`.tasks` sub-service) | `projects`, `projectTasks` |
| `CalendarService` | `events` |
| `StudyService` (`.sessions`, `.courses`, `.semesters`) | `sessions`, `courses`, `semesters` |
| `NotesService` | `notes` |
| `IdeaService` | `ideas` |
| `CertificationService` | `certifications` |
| `SkillService` | `skills` |
| `GoalService` | `goals` *(new, empty table)* |
| `ReminderService` | `reminders` *(new, empty table)* |
| `DashboardService` | composes the above for home-page stats |
| `SearchService` | universal search across every module — the seam for the future command palette and AI search |
| `BackupService` | local JSON export / restore — the seam for scheduled backups |

All exported from `src/lib/services/index.ts`.

## Verified

- Every existing `import { db } from "@/lib/db"` call site (22 files) only
  ever imports `db` — confirmed nothing else needs to change there.
- New `.ts` files were type-checked with `tsc --strict` against a stub of
  Dexie's API and passed with no errors.
- This sandbox has no network access and no installed `node_modules`, so a
  real `bun install && bun run build` / `vite dev` could not be run here.
  **Please run your usual dev command after pulling this in** — if
  anything doesn't compile, it'll most likely be a Dexie type nuance my
  stub didn't cover, not a logic error.

## Suggested next phases (not yet done — for your review first)

1. **Wire components to services.** Migrate the ~20 files currently calling
   `db.<table>` directly (dialogs, routes) to call the matching service
   instead. This is the highest-risk phase since it touches working UI
   code — best done incrementally, one feature area at a time, with you
   able to test between each.
2. **Feature-based folder structure.** Move `routes/tasks.jsx` +
   `components/task-dialog.jsx` → `features/tasks/`, etc. Mechanical but
   touches every import path — should follow #1, not precede it.
3. **Command palette wiring.** Point `components/command-palette.jsx` at
   `SearchService` instead of its own ad hoc queries.
4. **Backup UI.** A Settings-page action that calls
   `BackupService.exportAsJson()` and saves it (via Tauri's file APIs when
   running as a desktop app).
5. **Performance pass.** Memoization audit, route-level code splitting.

Happy to start on any of these next — just say which.
