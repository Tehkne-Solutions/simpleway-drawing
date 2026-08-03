import { desc, eq, gte, sql } from "drizzle-orm";
import type { Database } from "../client";
import { profiles, users } from "../schema/core";
import { alphaTesterActivity } from "../schema/operations";

export type TesterHeartbeat = {
  userId: string;
  stage: string;
  path?: string | null;
  metadata?: Record<string, unknown>;
};

export type InterventionReason = "NO_PROGRESS" | "IDLE" | "LOW_FEEDBACK" | "STALLED_STAGE";

export type TesterIntervention = {
  userId: string;
  displayName: string | null;
  stage: string | null;
  cohortLabel: string | null;
  lastSeenAt: Date;
  sessionCount: number;
  heartbeatCount: number;
  latestRating: number | null;
  reasons: InterventionReason[];
  priority: "HIGH" | "MEDIUM" | "LOW";
};

export type TesterOperationsSnapshot = {
  userId: string;
  displayName: string | null;
  preferredPath: string | null;
  experienceLevel: string | null;
  primaryGoal: string | null;
  cohortLabel: string | null;
  stage: string | null;
  lastPath: string | null;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  sessionCount: number;
  heartbeatCount: number;
  evidenceCount: number;
  artworkCount: number;
  feedbackCount: number;
  averageRating: number | null;
};

export type AlphaOperationsOverview = {
  totalTesters: number;
  onboardedTesters: number;
  trackedTesters: number;
  active24h: number;
  stages: Record<string, number>;
  recent: Array<{
    userId: string;
    displayName: string | null;
    stage: string | null;
    path: string | null;
    lastSeenAt: Date;
    heartbeatCount: number;
  }>;
};

export class DrizzleOperationsRepository {
  constructor(private readonly db: Database) {}

  async recordHeartbeat(input: TesterHeartbeat): Promise<void> {
    const now = new Date();
    await this.db
      .insert(alphaTesterActivity)
      .values({
        userId: input.userId,
        lastSeenAt: now,
        heartbeatCount: 1,
        lastStage: input.stage,
        lastPath: input.path ?? null,
        clientMetadata: input.metadata ?? {},
      })
      .onConflictDoUpdate({
        target: alphaTesterActivity.userId,
        set: {
          lastSeenAt: now,
          heartbeatCount: sql`${alphaTesterActivity.heartbeatCount} + 1`,
          lastStage: input.stage,
          lastPath: input.path ?? null,
          clientMetadata: input.metadata ?? {},
        },
      });
  }

  async markSession(userId: string): Promise<void> {
    const now = new Date();
    await this.db
      .insert(alphaTesterActivity)
      .values({ userId, firstSeenAt: now, lastSeenAt: now, sessionCount: 1 })
      .onConflictDoUpdate({
        target: alphaTesterActivity.userId,
        set: {
          lastSeenAt: now,
          sessionCount: sql`${alphaTesterActivity.sessionCount} + 1`,
        },
      });
  }

  async getInterventionQueue(limit = 50): Promise<TesterIntervention[]> {
    const rows = await this.db
      .select({
        userId: alphaTesterActivity.userId,
        displayName: profiles.displayName,
        stage: alphaTesterActivity.lastStage,
        lastSeenAt: alphaTesterActivity.lastSeenAt,
        sessionCount: alphaTesterActivity.sessionCount,
        heartbeatCount: alphaTesterActivity.heartbeatCount,
        cohortLabel: sql<string | null>`(
          select i.label from alpha_invite_redemptions r
          join alpha_invites i on i.id = r.invite_id
          where r.user_id = ${alphaTesterActivity.userId}
          order by r.redeemed_at desc limit 1
        )`,
        latestRating: sql<string | null>`(
          select (o.payload->>'rating')::text from system_outbox_events o
          where o.event_type = 'alpha.feedback.submitted.v1'
            and o.aggregate_id = ${alphaTesterActivity.userId}::text
          order by o.created_at desc limit 1
        )`,
      })
      .from(alphaTesterActivity)
      .leftJoin(profiles, eq(profiles.userId, alphaTesterActivity.userId))
      .orderBy(desc(alphaTesterActivity.lastSeenAt))
      .limit(Math.max(1, Math.min(limit, 100)));

    const now = Date.now();
    return rows.flatMap((row) => {
      if (row.stage === "COMPLETE") return [];
      const reasons: InterventionReason[] = [];
      const ageHours = Math.max(0, (now - row.lastSeenAt.getTime()) / 3_600_000);
      const rating = row.latestRating === null ? null : Number(row.latestRating);
      if (!row.stage && row.sessionCount >= 1) reasons.push("NO_PROGRESS");
      if (ageHours >= 24) reasons.push("IDLE");
      if (rating !== null && rating <= 2) reasons.push("LOW_FEEDBACK");
      if (row.heartbeatCount >= 8 && row.stage && row.stage !== "ALPHA_GATE") reasons.push("STALLED_STAGE");
      if (reasons.length === 0) return [];
      const high = reasons.includes("LOW_FEEDBACK") || (reasons.includes("IDLE") && reasons.includes("STALLED_STAGE"));
      return [{
        userId: row.userId,
        displayName: row.displayName,
        stage: row.stage,
        cohortLabel: row.cohortLabel,
        lastSeenAt: row.lastSeenAt,
        sessionCount: row.sessionCount,
        heartbeatCount: row.heartbeatCount,
        latestRating: rating,
        reasons,
        priority: high ? "HIGH" as const : reasons.length >= 2 ? "MEDIUM" as const : "LOW" as const,
      }];
    }).sort((a, b) => ({ HIGH: 3, MEDIUM: 2, LOW: 1 }[b.priority] - { HIGH: 3, MEDIUM: 2, LOW: 1 }[a.priority]));
  }

  async getTesterSnapshot(userId: string): Promise<TesterOperationsSnapshot | null> {
    const [row] = await this.db
      .select({
        userId: users.id,
        displayName: profiles.displayName,
        preferredPath: profiles.preferredPath,
        experienceLevel: profiles.experienceLevel,
        primaryGoal: profiles.primaryGoal,
        cohortLabel: sql<string | null>`(
          select i.label from alpha_invite_redemptions r
          join alpha_invites i on i.id = r.invite_id
          where r.user_id = ${users.id}
          order by r.redeemed_at desc limit 1
        )`,
        stage: alphaTesterActivity.lastStage,
        lastPath: alphaTesterActivity.lastPath,
        firstSeenAt: alphaTesterActivity.firstSeenAt,
        lastSeenAt: alphaTesterActivity.lastSeenAt,
        sessionCount: alphaTesterActivity.sessionCount,
        heartbeatCount: alphaTesterActivity.heartbeatCount,
        evidenceCount: sql<number>`(select count(*)::int from skill_evidence e where e.user_id = ${users.id})`,
        artworkCount: sql<number>`(select count(*)::int from artworks a where a.owner_user_id = ${users.id})`,
        feedbackCount: sql<number>`(select count(*)::int from system_outbox_events o where o.event_type = 'alpha.feedback.submitted.v1' and o.aggregate_id = ${users.id}::text)`,
        averageRating: sql<string | null>`(
          select round(avg((o.payload->>'rating')::numeric), 2)::text
          from system_outbox_events o
          where o.event_type = 'alpha.feedback.submitted.v1' and o.aggregate_id = ${users.id}::text
        )`,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(alphaTesterActivity, eq(alphaTesterActivity.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!row) return null;
    return {
      ...row,
      sessionCount: Number(row.sessionCount ?? 0),
      heartbeatCount: Number(row.heartbeatCount ?? 0),
      evidenceCount: Number(row.evidenceCount ?? 0),
      artworkCount: Number(row.artworkCount ?? 0),
      feedbackCount: Number(row.feedbackCount ?? 0),
      averageRating: row.averageRating === null ? null : Number(row.averageRating),
    };
  }

  async getOverview(): Promise<AlphaOperationsOverview> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [[userStats], [trackedStats], [activeStats], activityRows] = await Promise.all([
      this.db
        .select({
          total: sql<number>`count(*)`,
          onboarded: sql<number>`count(*) filter (where ${profiles.onboardingCompletedAt} is not null)`,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id)),
      this.db.select({ total: sql<number>`count(*)` }).from(alphaTesterActivity),
      this.db.select({ total: sql<number>`count(*)` }).from(alphaTesterActivity).where(gte(alphaTesterActivity.lastSeenAt, since)),
      this.db
        .select({
          userId: alphaTesterActivity.userId,
          displayName: profiles.displayName,
          stage: alphaTesterActivity.lastStage,
          path: alphaTesterActivity.lastPath,
          lastSeenAt: alphaTesterActivity.lastSeenAt,
          heartbeatCount: alphaTesterActivity.heartbeatCount,
        })
        .from(alphaTesterActivity)
        .leftJoin(profiles, eq(profiles.userId, alphaTesterActivity.userId))
        .orderBy(desc(alphaTesterActivity.lastSeenAt))
        .limit(25),
    ]);

    const stageRows = await this.db
      .select({ stage: alphaTesterActivity.lastStage, total: sql<number>`count(*)` })
      .from(alphaTesterActivity)
      .groupBy(alphaTesterActivity.lastStage);

    return {
      totalTesters: Number(userStats?.total ?? 0),
      onboardedTesters: Number(userStats?.onboarded ?? 0),
      trackedTesters: Number(trackedStats?.total ?? 0),
      active24h: Number(activeStats?.total ?? 0),
      stages: Object.fromEntries(stageRows.map((row) => [row.stage ?? "UNKNOWN", Number(row.total)])),
      recent: activityRows,
    };
  }
}
