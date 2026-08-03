import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../client";
import { outboxEvents } from "../schema/core";
import { alphaInviteRedemptions, alphaInvites } from "../schema/operations";

export type AlphaCohortAnalytics = {
  inviteId: string;
  label: string;
  status: string;
  createdAt: Date;
  maxUses: number;
  redeemed: number;
  onboarded: number;
  active7d: number;
  evidenceUsers: number;
  completed: number;
  feedbackCount: number;
  averageRating: number | null;
  activationRate: number;
  completionRate: number;
};

export class DrizzleCohortAnalyticsRepository {
  constructor(private readonly db: Database) {}

  async list(limit = 50): Promise<AlphaCohortAnalytics[]> {
    const [rows, feedbackRows] = await Promise.all([
      this.db
        .select({
          inviteId: alphaInvites.id,
          label: alphaInvites.label,
          status: alphaInvites.status,
          createdAt: alphaInvites.createdAt,
          maxUses: alphaInvites.maxUses,
          redeemed: sql<number>`(
            select count(*)::int from alpha_invite_redemptions r where r.invite_id = ${alphaInvites.id}
          )`,
          onboarded: sql<number>`(
            select count(*)::int
            from alpha_invite_redemptions r
            join profiles p on p.user_id = r.user_id
            where r.invite_id = ${alphaInvites.id} and p.onboarding_completed_at is not null
          )`,
          active7d: sql<number>`(
            select count(*)::int
            from alpha_invite_redemptions r
            join alpha_tester_activity a on a.user_id = r.user_id
            where r.invite_id = ${alphaInvites.id} and a.last_seen_at >= now() - interval '7 days'
          )`,
          evidenceUsers: sql<number>`(
            select count(*)::int
            from alpha_invite_redemptions r
            where r.invite_id = ${alphaInvites.id}
              and exists (
                select 1
                from learner_skill_states s
                where s.user_id = r.user_id and s.evidence_count > 0
              )
          )`,
          completed: sql<number>`(
            select count(*)::int
            from alpha_invite_redemptions r
            join alpha_tester_activity a on a.user_id = r.user_id
            where r.invite_id = ${alphaInvites.id} and a.last_stage = 'COMPLETE'
          )`,
        })
        .from(alphaInvites)
        .orderBy(desc(alphaInvites.createdAt))
        .limit(Math.max(1, Math.min(limit, 100))),
      this.db
        .select({
          inviteId: alphaInviteRedemptions.inviteId,
          feedbackCount: sql<number>`count(${outboxEvents.id})::int`,
          averageRating: sql<string | null>`round(avg((${outboxEvents.payload}->>'rating')::numeric), 2)::text`,
        })
        .from(alphaInviteRedemptions)
        .innerJoin(
          outboxEvents,
          and(
            eq(outboxEvents.aggregateType, "USER"),
            eq(outboxEvents.eventType, "alpha.feedback.submitted.v1"),
            sql`${outboxEvents.aggregateId} = ${alphaInviteRedemptions.userId}::text`,
          ),
        )
        .groupBy(alphaInviteRedemptions.inviteId),
    ]);

    const feedbackByInvite = new Map(feedbackRows.map((row) => [row.inviteId, {
      feedbackCount: Number(row.feedbackCount ?? 0),
      averageRating: row.averageRating === null ? null : Number(row.averageRating),
    }]));

    return rows.map((row) => {
      const redeemed = Number(row.redeemed ?? 0);
      const onboarded = Number(row.onboarded ?? 0);
      const completed = Number(row.completed ?? 0);
      const feedback = feedbackByInvite.get(row.inviteId) ?? { feedbackCount: 0, averageRating: null };
      return {
        inviteId: row.inviteId,
        label: row.label,
        status: row.status,
        createdAt: row.createdAt,
        maxUses: row.maxUses,
        redeemed,
        onboarded,
        active7d: Number(row.active7d ?? 0),
        evidenceUsers: Number(row.evidenceUsers ?? 0),
        completed,
        feedbackCount: feedback.feedbackCount,
        averageRating: feedback.averageRating,
        activationRate: redeemed > 0 ? Math.round((onboarded / redeemed) * 100) : 0,
        completionRate: redeemed > 0 ? Math.round((completed / redeemed) * 100) : 0,
      };
    });
  }
}
