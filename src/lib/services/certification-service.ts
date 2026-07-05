import { db, type Certification, type CertificationStatusType, withDb } from "@/lib/db";
import { createBaseService } from "./base-service";

const base = createBaseService<Certification>("certifications");

export const CertificationService = {
  ...base,

  async listByStatus(status: CertificationStatusType): Promise<Certification[]> {
    return withDb("certifications", "list by status", () =>
      db.certifications.filter((c) => !c.archived && c.status === status).toArray(),
    );
  },

  async listByProvider(provider: string): Promise<Certification[]> {
    return withDb("certifications", "list by provider", () =>
      db.certifications.where("provider").equals(provider).toArray(),
    );
  },
};
