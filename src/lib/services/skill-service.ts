import { db, type Skill, withDb } from "@/lib/db";
import { createBaseService } from "./base-service";

const base = createBaseService<Skill>("skills");

export const SkillService = {
  ...base,

  async listByCategory(category: string): Promise<Skill[]> {
    return withDb("skills", "list by category", () =>
      db.skills.filter((s) => !s.archived && s.category === category).toArray(),
    );
  },

  async listCategories(): Promise<string[]> {
    return withDb("skills", "list categories", async () => {
      const skills = await db.skills.toArray();
      return Array.from(new Set(skills.map((s) => s.category))).sort();
    });
  },
};
