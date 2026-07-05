/**
 * Generic CRUD building block for the service layer.
 * ────────────────────────────────────────────────────────────────────────
 * Every domain service (AssignmentService, ProjectService, ...) is built
 * on top of `createBaseService`, which gives it consistent, typed,
 * error-handled create/read/update/archive/delete behavior for free.
 * Domain services then add their own query methods (byProgram, upcoming,
 * etc.) on top — see e.g. `assignment-service.ts`.
 *
 * UI components should call services, not `db.<table>` directly. This is
 * what makes the eventual command palette, universal search, backups, and
 * AI integration possible without touching every component: they can all
 * go through the same service methods.
 */
import type { Table } from "dexie";
import {
  db,
  type BaseRecord,
  type EntityId,
  type TableName,
  createRecord,
  updateRecord,
  archiveRecord,
  unarchiveRecord,
  softDelete,
  hardDelete,
  withDb,
} from "@/lib/db";

export interface BaseService<T extends BaseRecord> {
  /** All rows, including archived. Prefer `listActive` for normal UI lists. */
  list(): Promise<T[]>;
  /** Rows where `archived` is not `true`. This matches the filter every
   *  existing page already applies by hand (`.filter(t => !t.archived)`). */
  listActive(): Promise<T[]>;
  listArchived(): Promise<T[]>;
  get(id: EntityId): Promise<T | undefined>;
  create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<EntityId>;
  update(id: EntityId, patch: Partial<Omit<T, "id" | "createdAt">>): Promise<number>;
  archive(id: EntityId): Promise<number>;
  unarchive(id: EntityId): Promise<number>;
  /** Soft-delete (future trash/undo). Does not remove the row. */
  softRemove(id: EntityId): Promise<number>;
  /** Permanently remove the row — same behavior as today's delete buttons. */
  remove(id: EntityId): Promise<void>;
  count(): Promise<number>;
}

export function createBaseService<T extends BaseRecord>(
  tableName: TableName,
): BaseService<T> {
  const table = () => db[tableName] as unknown as Table<T, EntityId>;

  return {
    list: () => withDb(tableName, "list", () => table().toArray()),

    listActive: () =>
      withDb(tableName, "list active", () =>
        table()
          .filter((row) => !row.archived)
          .toArray(),
      ),

    listArchived: () =>
      withDb(tableName, "list archived", () =>
        table()
          .filter((row) => !!row.archived)
          .toArray(),
      ),

    get: (id) => withDb(tableName, "get", () => table().get(id)),

    create: (data) => createRecord(tableName, table(), data),

    update: (id, patch) => updateRecord(tableName, table(), id, patch),

    archive: (id) => archiveRecord(tableName, table(), id),

    unarchive: (id) => unarchiveRecord(tableName, table(), id),

    softRemove: (id) => softDelete(tableName, table(), id),

    remove: (id) => hardDelete(tableName, table(), id),

    count: () => withDb(tableName, "count", () => table().count()),
  };
}
