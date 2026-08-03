import { updateMastery } from "@swd/domain";
import { and, eq } from "drizzle-orm";
import type { Database } from "../client";
import { exerciseAttempts, learnerSkillStates, outboxEvents, skillEvidence } from "../schema/core";
import { MASTERY_ALGORITHM_VERSION } from "./gym";

export const OBSERVATION_EXERCISES = {
  "exercise.swd.observation.ratio_match": {
    skillKey: "skill.drawing.perception.proportion",
    title: "Ratio Match",
    prompt: "A barra maior tem aproximadamente qual relação com a menor?",
    options: ["Quase iguais", "Cerca de 1,5×", "Cerca de 2×", "Cerca de 3×"],
    correctIndex: 2,
    explanation: "A barra menor cabe aproximadamente duas vezes dentro da maior.",
  },
  "exercise.swd.observation.angle_match": {
    skillKey: "skill.drawing.perception.angle",
    title: "Angle Match",
    prompt: "Qual direção corresponde melhor à linha de referência?",
    options: ["Quase horizontal", "Inclinação média para cima", "Muito íngreme", "Vertical"],
    correctIndex: 1,
    explanation: "A referência sobe de forma clara, mas permanece distante de uma direção vertical.",
  },
  "exercise.swd.observation.alignment_hunt": {
    skillKey: "skill.drawing.perception.alignment",
    title: "Alignment Hunt",
    prompt: "Qual ponto está mais alinhado verticalmente com o marcador superior?",
    options: ["A", "B", "C", "D"],
    correctIndex: 2,
    explanation: "O ponto C compartilha praticamente a mesma coordenada horizontal do marcador superior.",
  },
  "exercise.swd.observation.negative_space": {
    skillKey: "skill.drawing.perception.negative_space",
    title: "Negative Space",
    prompt: "Qual forma representa melhor o espaço vazio entre os dois objetos?",
    options: ["Triângulo estreito", "Retângulo largo", "Forma de ampulheta", "Círculo"],
    correctIndex: 2,
    explanation: "As bordas dos dois objetos estreitam no centro e abrem nas extremidades, formando um vazio semelhante a uma ampulheta.",
  },
} as const;

export type ObservationExerciseKey = keyof typeof OBSERVATION_EXERCISES;

function isObservationKey(value: string): value is ObservationExerciseKey {
  return value in OBSERVATION_EXERCISES;
}

export class DrizzleObservationRepository {
  constructor(private readonly db: Database) {}

  listExercises() {
    return Object.entries(OBSERVATION_EXERCISES).map(([key, exercise]) => ({
      key: key as ObservationExerciseKey,
      title: exercise.title,
      prompt: exercise.prompt,
      options: [...exercise.options],
      skillKey: exercise.skillKey,
    }));
  }

  async submitChoice(userId: string, exerciseKey: string, answerIndex: number, responseMs: number) {
    if (!isObservationKey(exerciseKey)) throw new Error("OBSERVATION_EXERCISE_NOT_SUPPORTED");
    const config = OBSERVATION_EXERCISES[exerciseKey];
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= config.options.length) throw new Error("INVALID_OBSERVATION_ANSWER");
    const correct = answerIndex === config.correctIndex;
    const value = correct ? 1 : 0;
    const confidence = Math.max(0.55, Math.min(0.9, 0.82 - Math.max(responseMs - 3_000, 0) / 50_000));

    return this.db.transaction(async (tx) => {
      const [attempt] = await tx.insert(exerciseAttempts).values({
        userId,
        exerciseKey,
        exerciseVersion: 1,
        status: "SUBMITTED",
        assistanceLevel: 0,
        difficultySnapshot: { perception: 1, transfer: 1 },
        submittedAt: new Date(),
      }).returning({ id: exerciseAttempts.id });
      if (!attempt) throw new Error("OBSERVATION_ATTEMPT_CREATE_FAILED");

      const [evidence] = await tx.insert(skillEvidence).values({
        userId,
        skillKey: config.skillKey,
        evidenceType: "PERCEPTUAL_CHOICE",
        dimension: exerciseKey.split(".").at(-1) ?? "observation",
        value: value.toFixed(4),
        confidence: confidence.toFixed(4),
        assistanceLevel: 0,
        difficulty: { perception: 1 },
        context: "OBSERVATION_LAB",
        sourceType: "exercise_attempt",
        sourceId: attempt.id,
        evaluatorType: "SYSTEM_MEASURED",
        evaluatorVersion: `${exerciseKey}-v1`,
      }).returning({ id: skillEvidence.id });
      if (!evidence) throw new Error("OBSERVATION_EVIDENCE_CREATE_FAILED");

      const [previous] = await tx.select({
        masteryScore: learnerSkillStates.masteryScore,
        confidence: learnerSkillStates.confidence,
        evidenceCount: learnerSkillStates.evidenceCount,
      }).from(learnerSkillStates).where(and(eq(learnerSkillStates.userId, userId), eq(learnerSkillStates.skillKey, config.skillKey))).limit(1);

      const mastery = updateMastery(previous ? {
        masteryScore: Number(previous.masteryScore),
        confidence: Number(previous.confidence),
        evidenceCount: previous.evidenceCount,
      } : null, { value, confidence, assistanceLevel: 0 });
      const now = new Date();
      const nextReviewAt = new Date(now.getTime() + mastery.nextReviewDays * 86_400_000);

      await tx.insert(learnerSkillStates).values({
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

      await tx.insert(outboxEvents).values({
        eventType: "mastery.evidence.recorded.v1",
        aggregateType: "skill_evidence",
        aggregateId: evidence.id,
        payload: { userId, skillKey: config.skillKey, exerciseKey, attemptId: attempt.id, evidenceType: "PERCEPTUAL_CHOICE", correct },
      });

      return {
        attemptId: attempt.id,
        evidenceId: evidence.id,
        skillKey: config.skillKey,
        correct,
        correctIndex: config.correctIndex,
        explanation: config.explanation,
        masteryScore: mastery.masteryScore,
        masteryLevel: mastery.masteryLevel,
        evidenceCount: mastery.evidenceCount,
      };
    });
  }
}
