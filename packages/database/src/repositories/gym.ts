import { updateMastery } from "@swd/domain";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client";
import { exerciseAttempts, learnerSkillStates, outboxEvents, skillEvidence } from "../schema/core";

export const INTENTIONAL_LINE_EXERCISE = "exercise.swd.gym.intentional_line";
export const LINE_CONTROL_SKILL = "skill.drawing.motor.line_control";
export const MASTERY_ALGORITHM_VERSION = "swd-mastery-v1";

export interface LineAttemptMetrics {
  accuracy: number;
  smoothness: number;
  durationMs: number;
  pointCount: number;
}

export interface GymAttemptResult {
  attemptId: string;
  evidenceId: string;
  score: number;
  masteryScore: number;
  masteryLevel: string;
  confidence: number;
  evidenceCount: number;
  coach: {
    headline: string;
    observation: string;
    nextAction: string;
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function coachFor(score: number, accuracy: number, smoothness: number): GymAttemptResult["coach"] {
  if (score >= 0.86) {
    return {
      headline: "Boa decisão de traço.",
      observation: "Você chegou perto do alvo mantendo uma linha estável.",
      nextAction: "Repita com um trajeto um pouco mais longo e preserve a mesma intenção.",
    };
  }
  if (accuracy + 0.08 < smoothness) {
    return {
      headline: "A linha está fluida; falta acertar o destino.",
      observation: "Seu movimento está relativamente estável, mas o ponto final ainda se afasta do alvo.",
      nextAction: "Antes de tocar a tela, fixe origem e destino e simule o gesto uma vez no ar.",
    };
  }
  if (smoothness + 0.08 < accuracy) {
    return {
      headline: "Você encontra o alvo; agora reduza correções no caminho.",
      observation: "O destino está bom, mas há pequenas mudanças de direção durante o traço.",
      nextAction: "Faça o próximo traço com menos pontos de correção e velocidade mais constante.",
    };
  }
  return {
    headline: "Planeje antes de executar.",
    observation: "Origem, destino e estabilidade ainda estão competindo pela sua atenção.",
    nextAction: "Olhe os dois pontos, faça um ghost stroke e só então comprometa o traço.",
  };
}

export class DrizzleGymRepository {
  constructor(private readonly db: Database) {}

  async submitIntentionalLine(userId: string, metrics: LineAttemptMetrics): Promise<GymAttemptResult> {
    const accuracy = clamp01(metrics.accuracy);
    const smoothness = clamp01(metrics.smoothness);
    const durationQuality = clamp01(1 - Math.abs(metrics.durationMs - 900) / 1800);
    const score = clamp01(accuracy * 0.48 + smoothness * 0.42 + durationQuality * 0.1);
    const evidenceConfidence = clamp01(0.72 + Math.min(metrics.pointCount, 40) / 200);

    return this.db.transaction(async (tx) => {
      const [attempt] = await tx
        .insert(exerciseAttempts)
        .values({
          userId,
          exerciseKey: INTENTIONAL_LINE_EXERCISE,
          exerciseVersion: 1,
          status: "SUBMITTED",
          assistanceLevel: 0,
          difficultySnapshot: { distance: 1, precision: 1, motorControl: 1 },
          submittedAt: new Date(),
        })
        .returning({ id: exerciseAttempts.id });
      if (!attempt) throw new Error("GYM_ATTEMPT_CREATE_FAILED");

      const [evidence] = await tx
        .insert(skillEvidence)
        .values({
          userId,
          skillKey: LINE_CONTROL_SKILL,
          evidenceType: "MOTOR_EXECUTION",
          dimension: "intentional_line",
          value: score.toFixed(4),
          confidence: evidenceConfidence.toFixed(4),
          assistanceLevel: 0,
          difficulty: { distance: 1, precision: 1 },
          context: "GYM",
          sourceType: "exercise_attempt",
          sourceId: attempt.id,
          evaluatorType: "SYSTEM_MEASURED",
          evaluatorVersion: "intentional-line-v1",
        })
        .returning({ id: skillEvidence.id });
      if (!evidence) throw new Error("GYM_EVIDENCE_CREATE_FAILED");

      const [previous] = await tx
        .select({
          masteryScore: learnerSkillStates.masteryScore,
          confidence: learnerSkillStates.confidence,
          evidenceCount: learnerSkillStates.evidenceCount,
        })
        .from(learnerSkillStates)
        .where(and(eq(learnerSkillStates.userId, userId), eq(learnerSkillStates.skillKey, LINE_CONTROL_SKILL)))
        .limit(1);

      const mastery = updateMastery(
        previous
          ? {
              masteryScore: Number(previous.masteryScore),
              confidence: Number(previous.confidence),
              evidenceCount: previous.evidenceCount,
            }
          : null,
        { value: score, confidence: evidenceConfidence, assistanceLevel: 0 },
      );
      const now = new Date();
      const nextReviewAt = new Date(now.getTime() + mastery.nextReviewDays * 86_400_000);

      await tx
        .insert(learnerSkillStates)
        .values({
          userId,
          skillKey: LINE_CONTROL_SKILL,
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
        })
        .onConflictDoUpdate({
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

      await tx.insert(outboxEvents).values({
        eventType: "mastery.evidence.recorded.v1",
        aggregateType: "skill_evidence",
        aggregateId: evidence.id,
        payload: {
          userId,
          skillKey: LINE_CONTROL_SKILL,
          attemptId: attempt.id,
          score,
          masteryScore: mastery.masteryScore,
          masteryLevel: mastery.masteryLevel,
        },
      });

      return {
        attemptId: attempt.id,
        evidenceId: evidence.id,
        score: Number(score.toFixed(4)),
        masteryScore: mastery.masteryScore,
        masteryLevel: mastery.masteryLevel,
        confidence: mastery.confidence,
        evidenceCount: mastery.evidenceCount,
        coach: coachFor(score, accuracy, smoothness),
      };
    });
  }

  async getLineControlState(userId: string) {
    const [state] = await this.db
      .select()
      .from(learnerSkillStates)
      .where(and(eq(learnerSkillStates.userId, userId), eq(learnerSkillStates.skillKey, LINE_CONTROL_SKILL)))
      .limit(1);
    const recentEvidence = await this.db
      .select({ value: skillEvidence.value, createdAt: skillEvidence.createdAt })
      .from(skillEvidence)
      .where(and(eq(skillEvidence.userId, userId), eq(skillEvidence.skillKey, LINE_CONTROL_SKILL)))
      .orderBy(desc(skillEvidence.createdAt))
      .limit(5);
    return { state: state ?? null, recentEvidence };
  }
}
