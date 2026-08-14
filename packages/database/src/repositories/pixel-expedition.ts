import { updateMastery } from "@swd/domain";
import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "../client";
import { exerciseAttempts, learnerSkillStates, outboxEvents, skillEvidence } from "../schema/core";
import { journeyEntries } from "../schema/journey";
import { MASTERY_ALGORITHM_VERSION } from "./gym";

export const PIXEL_EXPEDITION_DB_KEY = "expedition.swd.pixel.synthesis.v1";

export const PIXEL_EXPEDITION_MISSIONS = {
  pixel: {
    exerciseKey: "exercise.swd.pixel.synthesis",
    skillKey: "skill.drawing.creative.pixel_synthesis",
    title: "Olho de Croma · Forma dominada",
    reward: "Sigilo da Forma",
  },
  sprite: {
    exerciseKey: "exercise.swd.pixel.sprite_motion",
    skillKey: "skill.drawing.creative.sprite_motion",
    title: "Pulso de Croma · Movimento dominado",
    reward: "Sigilo do Movimento",
  },
  tile: {
    exerciseKey: "exercise.swd.pixel.tile_continuity",
    skillKey: "skill.drawing.creative.pattern_continuity",
    title: "Tessela de Croma · Continuidade dominada",
    reward: "Sigilo da Continuidade",
  },
  animation: {
    exerciseKey: "exercise.swd.pixel.animation_timing",
    skillKey: "skill.drawing.creative.animation_timing",
    title: "Ritmo de Croma · Tempo dominado",
    reward: "Sigilo do Ritmo",
  },
} as const;

export type PixelExpeditionMissionId = keyof typeof PIXEL_EXPEDITION_MISSIONS;

type EvidenceInput = {
  missionId: PixelExpeditionMissionId;
  exerciseKey: string;
  skillKey: string;
  title: string;
  reward: string;
  dimension: string;
  score: number;
  confidence: number;
  metrics: Record<string, number | string | boolean>;
};

export interface PixelExpeditionEvidenceState {
  missionId: PixelExpeditionMissionId;
  skillKey: string;
  masteryScore: number | null;
  masteryLevel: string | null;
  evidenceCount: number;
}

export interface PixelExpeditionSnapshot {
  expeditionKey: string;
  completedMissionIds: PixelExpeditionMissionId[];
  completedCount: number;
  xp: number;
  complete: boolean;
  evidence: PixelExpeditionEvidenceState[];
}

function missionIdForExercise(exerciseKey: string): PixelExpeditionMissionId | null {
  const entry = Object.entries(PIXEL_EXPEDITION_MISSIONS).find(([, config]) => config.exerciseKey === exerciseKey);
  return entry ? entry[0] as PixelExpeditionMissionId : null;
}

export class DrizzlePixelExpeditionRepository {
  constructor(private readonly db: Database) {}

  async getSnapshot(userId: string): Promise<PixelExpeditionSnapshot> {
    const configs = Object.values(PIXEL_EXPEDITION_MISSIONS);
    const attempts = await this.db.select({ exerciseKey: exerciseAttempts.exerciseKey })
      .from(exerciseAttempts)
      .where(and(
        eq(exerciseAttempts.userId, userId),
        eq(exerciseAttempts.status, "SUBMITTED"),
        inArray(exerciseAttempts.exerciseKey, configs.map((config) => config.exerciseKey)),
      ));
    const completedMissionIds = [...new Set(attempts.map((attempt) => missionIdForExercise(attempt.exerciseKey)).filter((value): value is PixelExpeditionMissionId => Boolean(value)))];
    const states = await this.db.select({
      skillKey: learnerSkillStates.skillKey,
      masteryScore: learnerSkillStates.masteryScore,
      masteryLevel: learnerSkillStates.masteryLevel,
      evidenceCount: learnerSkillStates.evidenceCount,
    }).from(learnerSkillStates).where(and(
      eq(learnerSkillStates.userId, userId),
      inArray(learnerSkillStates.skillKey, configs.map((config) => config.skillKey)),
    ));
    const stateBySkill = new Map(states.map((state) => [state.skillKey, state]));
    const evidence = (Object.entries(PIXEL_EXPEDITION_MISSIONS) as [PixelExpeditionMissionId, (typeof PIXEL_EXPEDITION_MISSIONS)[PixelExpeditionMissionId]][]).map(([missionId, config]) => {
      const state = stateBySkill.get(config.skillKey);
      return {
        missionId,
        skillKey: config.skillKey,
        masteryScore: state ? Number(state.masteryScore) : null,
        masteryLevel: state?.masteryLevel ?? null,
        evidenceCount: state?.evidenceCount ?? 0,
      };
    });
    return {
      expeditionKey: PIXEL_EXPEDITION_DB_KEY,
      completedMissionIds,
      completedCount: completedMissionIds.length,
      xp: completedMissionIds.length * 125,
      complete: completedMissionIds.length === Object.keys(PIXEL_EXPEDITION_MISSIONS).length,
      evidence,
    };
  }

  async recordMission(userId: string, input: EvidenceInput): Promise<{ created: boolean; snapshot: PixelExpeditionSnapshot }> {
    const expected = PIXEL_EXPEDITION_MISSIONS[input.missionId];
    if (!expected || expected.exerciseKey !== input.exerciseKey || expected.skillKey !== input.skillKey) throw new Error("PIXEL_EVIDENCE_CONFIG_MISMATCH");
    const created = await this.db.transaction(async (tx) => {
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
        difficultySnapshot: { expedition: PIXEL_EXPEDITION_DB_KEY, missionId: input.missionId, ...input.metrics },
        submittedAt: now,
      }).returning({ id: exerciseAttempts.id });
      if (!attempt) throw new Error("PIXEL_ATTEMPT_CREATE_FAILED");

      const [evidence] = await tx.insert(skillEvidence).values({
        userId,
        skillKey: expected.skillKey,
        evidenceType: "CREATIVE_PROCESS",
        dimension: input.dimension,
        value: input.score.toFixed(4),
        confidence: input.confidence.toFixed(4),
        assistanceLevel: 0,
        difficulty: { expedition: 1, processValidation: 1 },
        context: "PIXEL_EXPEDITION",
        sourceType: "exercise_attempt",
        sourceId: attempt.id,
        evaluatorType: "SYSTEM_MEASURED",
        evaluatorVersion: `${expected.exerciseKey}-v1`,
      }).returning({ id: skillEvidence.id });
      if (!evidence) throw new Error("PIXEL_EVIDENCE_CREATE_FAILED");

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
          expeditionKey: PIXEL_EXPEDITION_DB_KEY,
          missionId: input.missionId,
          exerciseKey: expected.exerciseKey,
          skillKey: expected.skillKey,
          reward: input.reward,
          description: `${input.reward} recuperado no Atelier da Síntese com Evidence validada pelo sistema.`,
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
        payload: { userId, skillKey: expected.skillKey, exerciseKey: expected.exerciseKey, attemptId: attempt.id, missionId: input.missionId, context: "PIXEL_EXPEDITION" },
      });
      if (journey) await tx.insert(outboxEvents).values({
        eventType: "studio.pixel_mission.completed.v1",
        aggregateType: "journey_entry",
        aggregateId: journey.id,
        payload: { userId, expeditionKey: PIXEL_EXPEDITION_DB_KEY, missionId: input.missionId, reward: input.reward },
      });

      const missionAttempts = await tx.select({ exerciseKey: exerciseAttempts.exerciseKey }).from(exerciseAttempts).where(and(
        eq(exerciseAttempts.userId, userId),
        eq(exerciseAttempts.status, "SUBMITTED"),
        inArray(exerciseAttempts.exerciseKey, Object.values(PIXEL_EXPEDITION_MISSIONS).map((config) => config.exerciseKey)),
      ));
      const uniqueExercises = new Set(missionAttempts.map((item) => item.exerciseKey));
      if (uniqueExercises.size === Object.keys(PIXEL_EXPEDITION_MISSIONS).length) {
        const [existingExpedition] = await tx.select({ id: journeyEntries.id }).from(journeyEntries).where(and(
          eq(journeyEntries.userId, userId),
          eq(journeyEntries.type, "PIXEL_EXPEDITION_COMPLETED"),
        )).limit(1);
        if (!existingExpedition) {
          const [expedition] = await tx.insert(journeyEntries).values({
            userId,
            type: "PIXEL_EXPEDITION_COMPLETED",
            title: "Emblema da Síntese formado",
            metadata: {
              expeditionKey: PIXEL_EXPEDITION_DB_KEY,
              description: "Forma, movimento, continuidade e tempo foram demonstrados com Evidence real nos quatro Ateliers Pixel.",
              rewards: Object.values(PIXEL_EXPEDITION_MISSIONS).map((config) => config.reward),
              xp: 500,
            },
            occurredAt: now,
          }).returning({ id: journeyEntries.id });
          if (expedition) await tx.insert(outboxEvents).values({
            eventType: "studio.pixel_expedition.completed.v1",
            aggregateType: "journey_entry",
            aggregateId: expedition.id,
            payload: { userId, expeditionKey: PIXEL_EXPEDITION_DB_KEY, xp: 500 },
          });
        }
      }
      return true;
    });
    return { created, snapshot: await this.getSnapshot(userId) };
  }
}
