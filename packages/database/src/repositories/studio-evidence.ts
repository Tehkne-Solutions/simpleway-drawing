import { updateMastery } from "@swd/domain";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../client";
import { exerciseAttempts, learnerSkillStates, outboxEvents, skillEvidence } from "../schema/core";
import { journeyEntries } from "../schema/journey";
import { MASTERY_ALGORITHM_VERSION } from "./gym";

export const STUDIO_EVIDENCE_MISSIONS = {
  manga: {
    exerciseKey: "exercise.swd.manga.head_views",
    skillKey: "skill.drawing.creative.manga_head_construction",
    title: "Códice de Croma · Cabeça em três vistas",
    reward: "Sigilo das Vistas",
  },
  isometric: {
    exerciseKey: "exercise.swd.isometric.cube_axes",
    skillKey: "skill.drawing.creative.isometric_construction",
    title: "Prisma de Croma · Três eixos dominados",
    reward: "Sigilo dos Eixos",
  },
} as const;

export type StudioEvidenceMissionId = keyof typeof STUDIO_EVIDENCE_MISSIONS;

type EvidenceInput = {
  missionId: StudioEvidenceMissionId;
  exerciseKey: string;
  skillKey: string;
  title: string;
  reward: string;
  dimension: string;
  score: number;
  confidence: number;
  metrics: Record<string, number | string | boolean>;
};

export interface StudioEvidenceSnapshot {
  completedMissionIds: StudioEvidenceMissionId[];
  evidence: Array<{
    missionId: StudioEvidenceMissionId;
    skillKey: string;
    masteryScore: number | null;
    masteryLevel: string | null;
    evidenceCount: number;
  }>;
}

function missionIdForExercise(exerciseKey: string): StudioEvidenceMissionId | null {
  const entry = Object.entries(STUDIO_EVIDENCE_MISSIONS).find(([, config]) => config.exerciseKey === exerciseKey);
  return entry ? entry[0] as StudioEvidenceMissionId : null;
}

export class DrizzleStudioEvidenceRepository {
  constructor(private readonly db: Database) {}

  async getSnapshot(userId: string): Promise<StudioEvidenceSnapshot> {
    const configs = Object.values(STUDIO_EVIDENCE_MISSIONS);
    const attempts = await this.db.select({ exerciseKey: exerciseAttempts.exerciseKey })
      .from(exerciseAttempts)
      .where(and(
        eq(exerciseAttempts.userId, userId),
        eq(exerciseAttempts.status, "SUBMITTED"),
        inArray(exerciseAttempts.exerciseKey, configs.map((config) => config.exerciseKey)),
      ));
    const completedMissionIds = [...new Set(attempts.map((attempt) => missionIdForExercise(attempt.exerciseKey)).filter((value): value is StudioEvidenceMissionId => Boolean(value)))];
    const states = await this.db.select({
      skillKey: learnerSkillStates.skillKey,
      masteryScore: learnerSkillStates.masteryScore,
      masteryLevel: learnerSkillStates.masteryLevel,
      evidenceCount: learnerSkillStates.evidenceCount,
    }).from(learnerSkillStates).where(and(
      eq(learnerSkillStates.userId, userId),
      inArray(learnerSkillStates.skillKey, configs.map((config) => config.skillKey)),
    ));
    const bySkill = new Map(states.map((state) => [state.skillKey, state]));
    const evidence = (Object.entries(STUDIO_EVIDENCE_MISSIONS) as [StudioEvidenceMissionId, (typeof STUDIO_EVIDENCE_MISSIONS)[StudioEvidenceMissionId]][]).map(([missionId, config]) => {
      const state = bySkill.get(config.skillKey);
      return {
        missionId,
        skillKey: config.skillKey,
        masteryScore: state ? Number(state.masteryScore) : null,
        masteryLevel: state?.masteryLevel ?? null,
        evidenceCount: state?.evidenceCount ?? 0,
      };
    });
    return { completedMissionIds, evidence };
  }

  async recordMission(userId: string, input: EvidenceInput): Promise<{ created: boolean; snapshot: StudioEvidenceSnapshot }> {
    const expected = STUDIO_EVIDENCE_MISSIONS[input.missionId];
    if (!expected || input.exerciseKey !== expected.exerciseKey || input.skillKey !== expected.skillKey) throw new Error("STUDIO_EVIDENCE_CONFIG_MISMATCH");

    const created = await this.db.transaction(async (tx) => {
      const missionLock = `${userId}:${expected.exerciseKey}`;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${missionLock}, 0))`);

      const [existing] = await tx.select({ id: exerciseAttempts.id }).from(exerciseAttempts).where(and(
        eq(exerciseAttempts.userId, userId),
        eq(exerciseAttempts.exerciseKey, expected.exerciseKey),
        eq(exerciseAttempts.status, "SUBMITTED"),
      )).limit(1);
      if (existing) return false;

      const now = new Date();
      const [attempt] = await tx.insert(exerciseAttempts).values({
        userId,
        exerciseKey: expected.exerciseKey,
        exerciseVersion: 1,
        status: "SUBMITTED",
        assistanceLevel: 0,
        difficultySnapshot: { studioMissionId: input.missionId, processValidation: 1, ...input.metrics },
        submittedAt: now,
      }).returning({ id: exerciseAttempts.id });
      if (!attempt) throw new Error("STUDIO_ATTEMPT_CREATE_FAILED");

      const [evidence] = await tx.insert(skillEvidence).values({
        userId,
        skillKey: expected.skillKey,
        evidenceType: "CREATIVE_PROCESS",
        dimension: input.dimension,
        value: input.score.toFixed(4),
        confidence: input.confidence.toFixed(4),
        assistanceLevel: 0,
        difficulty: { studio: 1, processValidation: 1 },
        context: "STUDIO_MISSION",
        sourceType: "exercise_attempt",
        sourceId: attempt.id,
        evaluatorType: "SYSTEM_MEASURED",
        evaluatorVersion: `${expected.exerciseKey}-v1`,
      }).returning({ id: skillEvidence.id });
      if (!evidence) throw new Error("STUDIO_EVIDENCE_CREATE_FAILED");

      const [previous] = await tx.select({
        masteryScore: learnerSkillStates.masteryScore,
        confidence: learnerSkillStates.confidence,
        evidenceCount: learnerSkillStates.evidenceCount,
      }).from(learnerSkillStates).where(and(
        eq(learnerSkillStates.userId, userId),
        eq(learnerSkillStates.skillKey, expected.skillKey),
      )).limit(1);
      const mastery = updateMastery(previous ? {
        masteryScore: Number(previous.masteryScore),
        confidence: Number(previous.confidence),
        evidenceCount: previous.evidenceCount,
      } : null, { value: input.score, confidence: input.confidence, assistanceLevel: 0 });
      const nextReviewAt = new Date(now.getTime() + mastery.nextReviewDays * 86_400_000);

      await tx.insert(learnerSkillStates).values({
        userId,
        skillKey: expected.skillKey,
        masteryScore: mastery.masteryScore.toFixed(4),
        masteryLevel: mastery.masteryLevel,
        confidence: mastery.confidence.toFixed(4),
        depth: mastery.masteryScore.toFixed(4),
        breadth: "0.2500",
        evidenceCount: mastery.evidenceCount,
        lastPracticedAt: now,
        nextReviewAt,
        masteryAlgorithmVersion: MASTERY_ALGORITHM_VERSION,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [learnerSkillStates.userId, learnerSkillStates.skillKey],
        set: {
          masteryScore: mastery.masteryScore.toFixed(4),
          masteryLevel: mastery.masteryLevel,
          confidence: mastery.confidence.toFixed(4),
          depth: mastery.masteryScore.toFixed(4),
          evidenceCount: mastery.evidenceCount,
          lastPracticedAt: now,
          nextReviewAt,
          masteryAlgorithmVersion: MASTERY_ALGORITHM_VERSION,
          updatedAt: now,
        },
      });

      const [journey] = await tx.insert(journeyEntries).values({
        userId,
        type: "STUDIO_MISSION_COMPLETED",
        title: input.title,
        metadata: {
          missionId: input.missionId,
          exerciseKey: expected.exerciseKey,
          skillKey: expected.skillKey,
          reward: input.reward,
          description: `${input.reward} recuperado com processo criativo validado pelo sistema.`,
          metrics: input.metrics,
          masteryScore: mastery.masteryScore,
          masteryLevel: mastery.masteryLevel,
        },
        occurredAt: now,
      }).returning({ id: journeyEntries.id });

      await tx.insert(outboxEvents).values({
        eventType: "mastery.evidence.recorded.v1",
        aggregateType: "skill_evidence",
        aggregateId: evidence.id,
        payload: { userId, skillKey: expected.skillKey, exerciseKey: expected.exerciseKey, attemptId: attempt.id, missionId: input.missionId, context: "STUDIO_MISSION" },
      });
      if (journey) await tx.insert(outboxEvents).values({
        eventType: "studio.mission.completed.v1",
        aggregateType: "journey_entry",
        aggregateId: journey.id,
        payload: { userId, missionId: input.missionId, reward: input.reward, skillKey: expected.skillKey },
      });
      return true;
    });

    return { created, snapshot: await this.getSnapshot(userId) };
  }
}
