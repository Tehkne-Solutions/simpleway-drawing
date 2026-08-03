import { desc, sql } from "drizzle-orm";
import type { Database } from "../client";
import { alphaInvites } from "../schema/operations";

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
    const rows = await this.db
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
        feedbackCount: sql<number>`(
          select count(*)::int
          from alpha_invite_redemptions r
          join system_outbox_events o on o.aggregate_id = r.user_id::text
          where r.invite_id = ${alphaInvites.id} and o.event_type = 'alpha.feedback.submitted.v1'
        )`,
        averageRating: sql<string | null>`(
          select round(avg((o.payload->>'rating')::numeric), 2)::text
          from alpha_invite_redemptions r
          join system_outbox_events o on o.aggregate_id = r.user_id::text
          where r.invite_id = ${alphaInvites.id} and o.event_type = 'alpha.feedback.submitted.v1'
        )`,
      })
      .from(alphaInvites)
      .orderBy(desc(alphaInvites.createdAt))
      .limit(Math.max(1, Math.min(limit, 100)));

    return rows.map((row) => {
      const redeemed = Number(row.redeemed ?? 0);
      const onboarded = Number(row.onboarded ?? 0);
      const completed = Number(row.completed ?? 0);
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
        feedbackCount: Number(row.feedbackCount ?? 0),
        averageRating: row.averageRating === null ? null : Number(row.averageRating),
        activationRate: redeemed > 0 ? Math.round((onboarded / redeemed) * 100) : 0,
        completionRate: redeemed > 0 ? Math.round((completed / redeemed) * 100) : 0,
      };
    });
  }
}
