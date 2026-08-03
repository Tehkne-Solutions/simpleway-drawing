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
