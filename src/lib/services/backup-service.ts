import { db, exportAllData, TABLE_NAMES, type TableName, withDb } from "@/lib/db";

const BACKUP_FORMAT_VERSION = 1;

export interface BackupFile {
  formatVersion: number;
  createdAt: number;
  app: "gv-os";
  tables: Record<TableName, unknown[]>;
}

/**
 * Local-only backup/export/restore. This is the foundation the spec asks
 * for (daily/weekly/manual backups, rotation, version history) — those are
 * just "call `createBackup()` on a schedule and keep the last N results",
 * which is intentionally left as a follow-up since it needs a place to
 * store files (Tauri filesystem APIs) that doesn't exist in the browser
 * dev build. No cloud sync anywhere in here, per spec.
 */
export const BackupService = {
  /** Build a full snapshot of every table as a single JSON-serializable object. */
  async createBackup(): Promise<BackupFile> {
    const tables = await exportAllData();
    return {
      formatVersion: BACKUP_FORMAT_VERSION,
      createdAt: Date.now(),
      app: "gv-os",
      tables,
    };
  },

  /** Serialize a backup to a JSON string, ready to write to a file. */
  async exportAsJson(): Promise<string> {
    const backup = await this.createBackup();
    return JSON.stringify(backup, null, 2);
  },

  /**
   * Restore from a previously exported backup. Replaces the contents of
   * every table included in the file. Runs inside a single Dexie
   * transaction so a failure partway through leaves existing data intact
   * rather than half-restored.
   */
  async restoreFromBackup(backup: BackupFile): Promise<void> {
    if (backup.app !== "gv-os") {
      throw new Error("This file isn't a GV OS backup.");
    }
    const tablesToRestore = Object.keys(backup.tables).filter((t) =>
      TABLE_NAMES.includes(t as TableName),
    ) as TableName[];

    await withDb("tasks", "restore", () =>
      db.transaction("rw", tablesToRestore.map((t) => db[t]), async () => {
        for (const name of tablesToRestore) {
          const rows = backup.tables[name];
          await db[name].clear();
          if (Array.isArray(rows) && rows.length > 0) {
            await db[name].bulkAdd(rows as never[]);
          }
        }
      }),
    );
  },

  /** Parse and validate a JSON string as a backup file before restoring it. */
  parseBackupJson(json: string): BackupFile {
    const parsed = JSON.parse(json);
    if (!parsed || parsed.app !== "gv-os" || typeof parsed.tables !== "object") {
      throw new Error("This doesn't look like a valid GV OS backup file.");
    }
    return parsed as BackupFile;
  },
};
