import { db, type Idea, type IdeaStatusType, withDb } from "@/lib/db";
import { createBaseService } from "./base-service";

const base = createBaseService<Idea>("ideas");

export const IdeaService = {
  ...base,

  async listByCategory(category: string): Promise<Idea[]> {
    return withDb("ideas", "list by category", () =>
      db.ideas.filter((i) => !i.archived && i.category === category).toArray(),
    );
  },

  async listByStatus(status: IdeaStatusType): Promise<Idea[]> {
    return withDb("ideas", "list by status", () =>
      db.ideas.filter((i) => !i.archived && i.status === status).toArray(),
    );
  },

  async setStatus(id: number, status: IdeaStatusType): Promise<number> {
    return base.update(id, { status });
  },
};
