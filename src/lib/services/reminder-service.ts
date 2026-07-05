import { db, type Reminder, type EntityId, withDb } from "@/lib/db";
import { createBaseService } from "./base-service";

const base = createBaseService<Reminder>("reminders");

/**
 * No UI reads/writes `db.reminders` yet — same status as GoalService.
 * The Notifications page currently derives "reminders" ad hoc from
 * deadlines across other tables; this table/service is here for when
 * standalone, user-created reminders are needed.
 */
export const ReminderService = {
  ...base,

  async listDue(before = Date.now()): Promise<Reminder[]> {
    return withDb("reminders", "list due", () =>
      db.reminders.filter((r) => !r.dismissed && r.remindAt <= before).toArray(),
    );
  },

  async listUpcoming(days = 7): Promise<Reminder[]> {
    const now = Date.now();
    const cutoff = now + days * 24 * 60 * 60 * 1000;
    return withDb("reminders", "list upcoming", () =>
      db.reminders
        .filter((r) => !r.dismissed && r.remindAt >= now && r.remindAt <= cutoff)
        .toArray(),
    );
  },

  async dismiss(id: EntityId): Promise<number> {
    return base.update(id, { dismissed: true });
  },
};
