import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { Database } from "../client";
import { outboxEvents, profiles, users } from "../schema/core";
import { alphaInviteRedemptions, alphaInvites } from "../schema/operations";

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function normalizeLabel(label: string): string {
  const normalized = label.trim();
  if (normalized.length < 2 || normalized.length > 120) throw new Error("INVITE_LABEL_INVALID");
  return normalized;
}

export const ALPHA_CONSENT_VERSION = "closed-alpha-v1";

export type AlphaInvite = {
  id: string;
  label: string;
  status: string;
  maxUses: number;
  uses: number;
  expiresAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export class DrizzleInvitationRepository {
  constructor(private readonly db: Database) {}

  async create(input: { label: string; maxUses?: number; expiresAt?: Date | null }): Promise<{ invite: AlphaInvite; code: string }> {
    const label = normalizeLabel(input.label);
    const maxUses = Math.max(1, Math.min(input.maxUses ?? 1, 100));
    const code = randomBytes(24).toString("base64url");
    const [row] = await this.db.insert(alphaInvites).values({ codeHash: hashCode(code), label, maxUses, expiresAt: input.expiresAt ?? null }).returning();
    if (!row) throw new Error("INVITE_CREATE_FAILED");
    return { invite: row, code };
  }

  async createBatch(input: { label: string; quantity: number; expiresAt?: Date | null }): Promise<Array<{ invite: AlphaInvite; code: string }>> {
    const baseLabel = normalizeLabel(input.label);
    const quantity = Math.max(2, Math.min(Math.trunc(input.quantity), 50));
    const width = String(quantity).length;
    const generated = Array.from({ length: quantity }, (_, index) => {
      const id = randomUUID();
      const code = randomBytes(24).toString("base64url");
      const suffix = String(index + 1).padStart(width, "0");
      const label = `${baseLabel} · ${suffix}`;
      if (label.length > 120) throw new Error("INVITE_LABEL_INVALID");
      return { id, code, label, codeHash: hashCode(code) };
    });

    const rows = await this.db.insert(alphaInvites).values(generated.map((item) => ({
      id: item.id,
      codeHash: item.codeHash,
      label: item.label,
      maxUses: 1,
      expiresAt: input.expiresAt ?? null,
    }))).returning();
    const byId = new Map(rows.map((row) => [row.id, row]));
    return generated.map((item) => {
      const row = byId.get(item.id);
      if (!row) throw new Error("INVITE_BATCH_CREATE_FAILED");
      return { invite: row, code: item.code };
    });
  }

  async list(limit = 50): Promise<AlphaInvite[]> {
    return this.db.select({
      id: alphaInvites.id,
      label: alphaInvites.label,
      status: alphaInvites.status,
      maxUses: alphaInvites.maxUses,
      uses: alphaInvites.uses,
      expiresAt: alphaInvites.expiresAt,
      createdAt: alphaInvites.createdAt,
      lastUsedAt: alphaInvites.lastUsedAt,
    }).from(alphaInvites).orderBy(desc(alphaInvites.createdAt)).limit(Math.max(1, Math.min(limit, 100)));
  }

  async redeem(code: string, consentVersion: string): Promise<{ userId: string; invite: AlphaInvite }> {
    if (code.length < 20 || code.length > 128) throw new Error("INVITE_INVALID");
    if (consentVersion !== ALPHA_CONSENT_VERSION) throw new Error("CONSENT_REQUIRED");
    const now = new Date();
    return this.db.transaction(async (tx) => {
      const [row] = await tx.select().from(alphaInvites).where(and(
        eq(alphaInvites.codeHash, hashCode(code)),
        eq(alphaInvites.status, "ACTIVE"),
        lt(alphaInvites.uses, alphaInvites.maxUses),
        or(isNull(alphaInvites.expiresAt), gt(alphaInvites.expiresAt, now)),
      )).limit(1).for("update");
      if (!row) throw new Error("INVITE_INVALID_OR_EXPIRED");

      const userId = randomUUID();
      await tx.insert(users).values({ id: userId, email: `alpha+${userId}@simpleway.local`, status: "GUEST" });
      await tx.insert(profiles).values({ userId, displayName: row.label });
      await tx.insert(alphaInviteRedemptions).values({ inviteId: row.id, userId });
      await tx.insert(outboxEvents).values({
        eventType: "alpha.consent.accepted.v1",
        aggregateType: "USER",
        aggregateId: userId,
        payload: {
          consentVersion,
          inviteId: row.id,
          scope: ["learning-progress", "artwork-uploads", "alpha-operations", "feedback"],
          acceptedAt: now.toISOString(),
        },
      });

      const [updated] = await tx.update(alphaInvites).set({
        uses: sql`${alphaInvites.uses} + 1`,
        lastUsedAt: now,
        status: row.uses + 1 >= row.maxUses ? "CONSUMED" : "ACTIVE",
      }).where(eq(alphaInvites.id, row.id)).returning();
      if (!updated) throw new Error("INVITE_CONSUME_FAILED");
      return { userId, invite: updated };
    });
  }

  async revoke(id: string): Promise<void> {
    await this.db.update(alphaInvites).set({ status: "REVOKED" }).where(eq(alphaInvites.id, id));
  }
}
