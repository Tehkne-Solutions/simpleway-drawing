import { updateMastery } from "@swd/domain";
import { and, eq } from "drizzle-orm";
import type { Database } from "../client";
import { exerciseAttempts, learnerSkillStates, outboxEvents, skillEvidence } from "../schema/core";
import { MASTERY_ALGORITHM_VERSION } from "./gym";

export const CONSTRUCTION_EXERCISES = {
  "exercise.swd.construction.decomposition": {
    skillKey: "skill.drawing.shape.decomposition",
    title: "Decomposition Match",
    prompt: "Qual conjunto de formas preserva melhor a estrutura principal?",
    options: ["1 círculo + detalhes", "1 caixa + 1 cápsula + 1 cilindro", "6 formas pequenas", "Somente o contorno final"],
    correctIndex: 1,
    explanation: "Poucas massas grandes preservam melhor estrutura, proporção e relações antes do detalhe.",
  },
  "exercise.swd.construction.envelope": {
    skillKey: "skill.drawing.shape.envelope",
    title: "Envelope Match",
    prompt: "Qual envelope captura melhor os extremos e a direção geral?",
    options: ["Envelope A", "Envelope B", "Envelope C", "Sem envelope"],
    correctIndex: 1,
    explanation: "O envelope B contém os quatro extremos e acompanha a direção dominante sem perseguir detalhes.",
  },
  "exercise.swd.construction.silhouette": {
    skillKey: "skill.drawing.shape.silhouette",
    title: "Silhouette Read",
    prompt: "Qual silhueta mantém a leitura estrutural mesmo sem detalhes internos?",
    options: ["A", "B", "C", "D"],
    correctIndex: 2,
    explanation: "A opção C preserva as massas e recortes que definem a leitura geral do objeto.",
  },
  "exercise.swd.construction.overlap": {
    skillKey: "skill.drawing.shape.overlap",
    title: "Overlap Logic",
    prompt: "Qual relação de sobreposição comunica corretamente frente e trás?",
    options: ["A cruza sem hierarquia", "B interrompe a forma traseira", "C funde as duas massas", "D remove o contato"],
    correctIndex: 1,
    explanation: "Interromper a forma traseira no contato cria uma ordem clara de profundidade e conexão.",
  },
} as const;

export type ConstructionExerciseKey = keyof typeof CONSTRUCTION_EXERCISES;

export interface ConstructionAttemptResult {
  attemptId: string;
  evidenceId: string;
  skillKey: string;
  correct: boolean;
  correctIndex: number;
  explanation: string;
  masteryScore: number;
  masteryLevel: string;
  evidenceCount: number;
}

function isConstructionKey(value: string): value is ConstructionExerciseKey {
  return value in CONSTRUCTION_EXERCISES;
}

export class DrizzleConstructionRepository {
  constructor(private readonly db: Database) {}

  listExercises() {
    return Object.entries(CONSTRUCTION_EXERCISES).map(([key, exercise]) => ({
      key: key as ConstructionExerciseKey,
      title: exercise.title,
      prompt: exercise.prompt,
      options: [...exercise.options],
      skillKey: exercise.skillKey,
    }));
  }

  async submitChoice(userId: string, exerciseKey: string, answerIndex: number): Promise<ConstructionAttemptResult> {
    if (!isConstructionKey(exerciseKey)) throw new Error("CONSTRUCTION_EXERCISE_NOT_SUPPORTED");
    const config = CONSTRUCTION_EXERCISES[exerciseKey];
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= config.options.length) throw new Error("INVALID_CONSTRUCTION_ANSWER");
    const correct = answerIndex === config.correctIndex;
    const value = correct ? 1 : 0;
    const confidence = 0.82;

    return this.db.transaction(async (tx) => {
      const [attempt] = await tx.insert(exerciseAttempts).values({
        userId,
        exerciseKey,
        exerciseVersion: 1,
        status: "SUBMITTED",
        assistanceLevel: 0,
        difficultySnapshot: { construction: 1, abstraction: 1 },
        submittedAt: new Date(),
      }).returning({ id: exerciseAttempts.id });
      if (!attempt) throw new Error("CONSTRUCTION_ATTEMPT_CREATE_FAILED");

      const [evidence] = await tx.insert(skillEvidence).values({
        userId,
        skillKey: config.skillKey,
        evidenceType: "STRUCTURAL_EXECUTION",
        dimension: exerciseKey.split(".").at(-1) ?? "construction",
        value: value.toFixed(4),
        confidence: confidence.toFixed(4),
        assistanceLevel: 0,
        difficulty: { construction: 1 },
        context: "CONSTRUCTION_LAB",
        sourceType: "exercise_attempt",
        sourceId: attempt.id,
        evaluatorType: "SYSTEM_MEASURED",
        evaluatorVersion: `${exerciseKey}-v1`,
      }).returning({ id: skillEvidence.id });
      if (!evidence) throw new Error("CONSTRUCTION_EVIDENCE_CREATE_FAILED");

      const [previous] = await tx.select({ masteryScore: learnerSkillStates.masteryScore, confidence: learnerSkillStates.confidence, evidenceCount: learnerSkillStates.evidenceCount })
        .from(learnerSkillStates)
        .where(and(eq(learnerSkillStates.userId, userId), eq(learnerSkillStates.skillKey, config.skillKey)))
        .limit(1);
      const mastery = updateMastery(previous ? { masteryScore: Number(previous.masteryScore), confidence: Number(previous.confidence), evidenceCount: previous.evidenceCount } : null, { value, confidence, assistanceLevel: 0 });
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
        set: { masteryScore: mastery.masteryScore.toFixed(4), masteryLevel: mastery.masteryLevel, confidence: mastery.confidence.toFixed(4), depth: mastery.masteryScore.toFixed(4), evidenceCount: mastery.evidenceCount, lastPracticedAt: now, nextReviewAt, masteryAlgorithmVersion: MASTERY_ALGORITHM_VERSION, updatedAt: now },
      });

      await tx.insert(outboxEvents).values({
        eventType: "mastery.evidence.recorded.v1",
        aggregateType: "skill_evidence",
        aggregateId: evidence.id,
        payload: { userId, skillKey: config.skillKey, exerciseKey, attemptId: attempt.id, evidenceType: "STRUCTURAL_EXECUTION", correct },
      });

      return { attemptId: attempt.id, evidenceId: evidence.id, skillKey: config.skillKey, correct, correctIndex: config.correctIndex, explanation: config.explanation, masteryScore: mastery.masteryScore, masteryLevel: mastery.masteryLevel, evidenceCount: mastery.evidenceCount };
    });
  }
}
