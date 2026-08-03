import { updateMastery } from "@swd/domain";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client";
import { exerciseAttempts, learnerSkillStates, outboxEvents, skillEvidence } from "../schema/core";

export const MASTERY_ALGORITHM_VERSION = "swd-mastery-v1";
export const INTENTIONAL_LINE_EXERCISE = "exercise.swd.gym.intentional_line";
export const LINE_CONTROL_SKILL = "skill.drawing.motor.line_control";

const DRILL_CONFIG = {
  "exercise.swd.gym.intentional_line": {
    skillKey: "skill.drawing.motor.line_control",
    title: "Controle de linha",
    label: "Linha intencional",
    targetDurationMs: 900,
    href: "/gym?exercise=exercise.swd.gym.intentional_line",
  },
  "exercise.swd.gym.curve_path": {
    skillKey: "skill.drawing.motor.curve_c",
    title: "Controle de curva",
    label: "Curve Path",
    targetDurationMs: 1300,
    href: "/gym?exercise=exercise.swd.gym.curve_path",
  },
  "exercise.swd.gym.ellipse_control": {
    skillKey: "skill.drawing.motor.ellipse",
    title: "Controle de elipse",
    label: "Ellipse Control",
    targetDurationMs: 1200,
    href: "/gym?exercise=exercise.swd.gym.ellipse_control",
  },
  "exercise.swd.gym.parallel_rails": {
    skillKey: "skill.drawing.motor.line_parallel",
    title: "Paralelismo",
    label: "Parallel Rails",
    targetDurationMs: 1100,
    href: "/gym?exercise=exercise.swd.gym.parallel_rails",
  },
} as const;

export type MotorExerciseKey = keyof typeof DRILL_CONFIG;

export interface MotorAttemptMetrics {
  accuracy: number;
  smoothness: number;
  durationMs: number;
  pointCount: number;
}

export type LineAttemptMetrics = MotorAttemptMetrics;

export interface GymAttemptResult {
  attemptId: string;
  evidenceId: string;
  exerciseKey: MotorExerciseKey;
  skillKey: string;
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

export interface PracticeRecommendation {
  skillKey: string;
  title: string;
  exerciseKey: MotorExerciseKey;
  href: string;
  priority: "INTRODUCE" | "DUE" | "DEVELOP" | "MAINTAIN";
  reason: string;
  masteryScore: number | null;
  masteryLevel: string | null;
  evidenceCount: number;
  nextReviewAt: Date | null;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function coachFor(label: string, score: number, accuracy: number, smoothness: number): GymAttemptResult["coach"] {
  if (score >= 0.86) {
    return {
      headline: `${label}: boa decisão de movimento.`,
      observation: "Você preservou a intenção e manteve boa proximidade com o alvo do exercício.",
      nextAction: "Repita aumentando levemente a amplitude sem perder a mesma estabilidade.",
    };
  }
  if (accuracy + 0.08 < smoothness) {
    return {
      headline: "O movimento está fluido; falta precisão.",
      observation: "Sua trajetória é relativamente estável, mas ainda se afasta do alvo visual.",
      nextAction: "Observe o caminho inteiro antes de começar e faça uma simulação do gesto no ar.",
    };
  }
  if (smoothness + 0.08 < accuracy) {
    return {
      headline: "A direção está boa; agora reduza microcorreções.",
      observation: "Você chega perto do objetivo, mas muda a direção várias vezes durante o gesto.",
      nextAction: "Execute com velocidade um pouco mais constante e menos correções intermediárias.",
    };
  }
  return {
    headline: "Planeje a trajetória antes de executar.",
    observation: "Precisão e estabilidade ainda estão competindo pela sua atenção.",
    nextAction: "Olhe o caminho, faça um ghost stroke e só então comprometa o movimento.",
  };
}

function isMotorExerciseKey(value: string): value is MotorExerciseKey {
  return value in DRILL_CONFIG;
}

export class DrizzleGymRepository {
  constructor(private readonly db: Database) {}

  async submitMotorDrill(userId: string, exerciseKey: string, metrics: MotorAttemptMetrics): Promise<GymAttemptResult> {
    if (!isMotorExerciseKey(exerciseKey)) throw new Error("GYM_EXERCISE_NOT_SUPPORTED");
    const config = DRILL_CONFIG[exerciseKey];
    const accuracy = clamp01(metrics.accuracy);
    const smoothness = clamp01(metrics.smoothness);
    const durationQuality = clamp01(1 - Math.abs(metrics.durationMs - config.targetDurationMs) / (config.targetDurationMs * 2));
    const score = clamp01(accuracy * 0.48 + smoothness * 0.42 + durationQuality * 0.1);
    const evidenceConfidence = clamp01(0.72 + Math.min(metrics.pointCount, 40) / 200);

    return this.db.transaction(async (tx) => {
      const [attempt] = await tx
        .insert(exerciseAttempts)
        .values({
          userId,
          exerciseKey,
          exerciseVersion: 1,
          status: "SUBMITTED",
          assistanceLevel: 0,
          difficultySnapshot: { precision: 1, motorControl: 1 },
          submittedAt: new Date(),
        })
        .returning({ id: exerciseAttempts.id });
      if (!attempt) throw new Error("GYM_ATTEMPT_CREATE_FAILED");

      const [evidence] = await tx
        .insert(skillEvidence)
        .values({
          userId,
          skillKey: config.skillKey,
          evidenceType: "MOTOR_EXECUTION",
          dimension: exerciseKey.split(".").at(-1) ?? "motor_drill",
          value: score.toFixed(4),
          confidence: evidenceConfidence.toFixed(4),
          assistanceLevel: 0,
          difficulty: { precision: 1, motorControl: 1 },
          context: "GYM",
          sourceType: "exercise_attempt",
          sourceId: attempt.id,
          evaluatorType: "SYSTEM_MEASURED",
          evaluatorVersion: `${exerciseKey}-v1`,
        })
        .returning({ id: skillEvidence.id });
      if (!evidence) throw new Error("GYM_EVIDENCE_CREATE_FAILED");

      const [previous] = await tx
        .select({ masteryScore: learnerSkillStates.masteryScore, confidence: learnerSkillStates.confidence, evidenceCount: learnerSkillStates.evidenceCount })
        .from(learnerSkillStates)
        .where(and(eq(learnerSkillStates.userId, userId), eq(learnerSkillStates.skillKey, config.skillKey)))
        .limit(1);

      const mastery = updateMastery(
        previous ? { masteryScore: Number(previous.masteryScore), confidence: Number(previous.confidence), evidenceCount: previous.evidenceCount } : null,
        { value: score, confidence: evidenceConfidence, assistanceLevel: 0 },
      );
      const now = new Date();
      const nextReviewAt = new Date(now.getTime() + mastery.nextReviewDays * 86_400_000);

      await tx
        .insert(learnerSkillStates)
        .values({
          userId,
          skillKey: config.skillKey,
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
        payload: { userId, skillKey: config.skillKey, exerciseKey, attemptId: attempt.id, score, masteryScore: mastery.masteryScore, masteryLevel: mastery.masteryLevel },
      });

      return {
        attemptId: attempt.id,
        evidenceId: evidence.id,
        exerciseKey,
        skillKey: config.skillKey,
        score: Number(score.toFixed(4)),
        masteryScore: mastery.masteryScore,
        masteryLevel: mastery.masteryLevel,
        confidence: mastery.confidence,
        evidenceCount: mastery.evidenceCount,
        coach: coachFor(config.label, score, accuracy, smoothness),
      };
    });
  }

  async submitIntentionalLine(userId: string, metrics: LineAttemptMetrics): Promise<GymAttemptResult> {
    return this.submitMotorDrill(userId, INTENTIONAL_LINE_EXERCISE, metrics);
  }

  async getLineControlState(userId: string) {
    return this.getSkillState(userId, LINE_CONTROL_SKILL);
  }

  async getSkillState(userId: string, skillKey: string) {
    const [state] = await this.db.select().from(learnerSkillStates).where(and(eq(learnerSkillStates.userId, userId), eq(learnerSkillStates.skillKey, skillKey))).limit(1);
    const recentEvidence = await this.db.select({ value: skillEvidence.value, createdAt: skillEvidence.createdAt }).from(skillEvidence).where(and(eq(skillEvidence.userId, userId), eq(skillEvidence.skillKey, skillKey))).orderBy(desc(skillEvidence.createdAt)).limit(5);
    return { state: state ?? null, recentEvidence };
  }

  async getPracticePlan(userId: string): Promise<PracticeRecommendation[]> {
    const states = await this.db.select().from(learnerSkillStates).where(eq(learnerSkillStates.userId, userId));
    const stateBySkill = new Map(states.map((state) => [state.skillKey, state]));
    const now = new Date();

    return (Object.entries(DRILL_CONFIG) as [MotorExerciseKey, (typeof DRILL_CONFIG)[MotorExerciseKey]][])
      .map(([exerciseKey, config]): PracticeRecommendation => {
        const state = stateBySkill.get(config.skillKey) ?? null;
        if (!state) {
          return {
            skillKey: config.skillKey,
            title: config.title,
            exerciseKey,
            href: config.href,
            priority: "INTRODUCE",
            reason: "Ainda não há evidência suficiente para esta habilidade de C1.",
            masteryScore: null,
            masteryLevel: null,
            evidenceCount: 0,
            nextReviewAt: null,
          };
        }
        const score = Number(state.masteryScore);
        const due = !state.nextReviewAt || state.nextReviewAt <= now;
        const priority: PracticeRecommendation["priority"] = due ? "DUE" : score < 0.74 ? "DEVELOP" : "MAINTAIN";
        const reason = due
          ? `A revisão de ${config.title.toLowerCase()} está disponível agora.`
          : score < 0.74
            ? "Esta habilidade ainda precisa de prática deliberada para ganhar consistência."
            : "Uma repetição curta ajuda a manter a habilidade sem overtraining.";
        return {
          skillKey: config.skillKey,
          title: config.title,
          exerciseKey,
          href: config.href,
          priority,
          reason,
          masteryScore: score,
          masteryLevel: state.masteryLevel,
          evidenceCount: state.evidenceCount,
          nextReviewAt: state.nextReviewAt,
        };
      })
      .sort((a, b) => {
        const rank = { DUE: 0, DEVELOP: 1, INTRODUCE: 2, MAINTAIN: 3 } as const;
        return rank[a.priority] - rank[b.priority];
      });
  }
}
