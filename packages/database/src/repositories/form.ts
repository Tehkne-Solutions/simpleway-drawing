import { updateMastery } from "@swd/domain";
import { and, eq } from "drizzle-orm";
import type { Database } from "../client";
import { exerciseAttempts, learnerSkillStates, outboxEvents, skillEvidence } from "../schema/core";
import { MASTERY_ALGORITHM_VERSION } from "./gym";

export const FORM_EXERCISES = {
  "exercise.swd.form.box_orientation": {
    skillKey: "skill.drawing.form.box",
    title: "Box Orientation",
    prompt: "Qual caixa mantém os três conjuntos de arestas coerentes com a orientação mostrada?",
    options: ["Caixa A", "Caixa B", "Caixa C", "Caixa D"],
    correctIndex: 1,
    explanation: "A caixa B mantém direção e profundidade coerentes entre os três conjuntos de arestas.",
  },
  "exercise.swd.form.cylinder_axis": {
    skillKey: "skill.drawing.form.cylinder",
    title: "Cylinder Axis",
    prompt: "Qual cilindro mantém as duas elipses alinhadas ao mesmo eixo?",
    options: ["A", "B", "C", "D"],
    correctIndex: 2,
    explanation: "A opção C mantém centro e eixo das duas extremidades pertencendo ao mesmo volume.",
  },
  "exercise.swd.form.ellipse_plane": {
    skillKey: "skill.drawing.form.ellipse_space",
    title: "Ellipse Plane",
    prompt: "Qual elipse descreve melhor a orientação do plano indicado?",
    options: ["Muito fechada", "Abertura média coerente", "Círculo frontal", "Elipse invertida"],
    correctIndex: 1,
    explanation: "A abertura média corresponde à inclinação do plano sem transformá-lo em uma vista frontal.",
  },
  "exercise.swd.form.cross_contour": {
    skillKey: "skill.drawing.form.cross_contour",
    title: "Surface Wrap",
    prompt: "Qual cross-contour parece realmente envolver a superfície?",
    options: ["Linha reta", "Arco que acompanha o giro", "Zigue-zague", "Linha tangente"],
    correctIndex: 1,
    explanation: "O arco acompanha a curvatura e comunica como a superfície continua para os lados.",
  },
  "exercise.swd.form.mental_rotation": {
    skillKey: "skill.drawing.spatial.mental_rotation",
    title: "Mental Rotation",
    prompt: "Qual opção representa a mesma forma após a rotação indicada?",
    options: ["A", "B", "C", "D"],
    correctIndex: 3,
    explanation: "A opção D preserva as relações entre os volumes enquanto altera corretamente sua orientação no espaço.",
  },
} as const;

export type FormExerciseKey = keyof typeof FORM_EXERCISES;

export interface FormAttemptResult {
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

function isFormKey(value: string): value is FormExerciseKey {
  return value in FORM_EXERCISES;
}

export class DrizzleFormRepository {
  constructor(private readonly db: Database) {}

  listExercises() {
    return Object.entries(FORM_EXERCISES).map(([key, exercise]) => ({
      key: key as FormExerciseKey,
      title: exercise.title,
      prompt: exercise.prompt,
      options: [...exercise.options],
      skillKey: exercise.skillKey,
    }));
  }

  async submitChoice(userId: string, exerciseKey: string, answerIndex: number): Promise<FormAttemptResult> {
    if (!isFormKey(exerciseKey)) throw new Error("FORM_EXERCISE_NOT_SUPPORTED");
    const config = FORM_EXERCISES[exerciseKey];
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= config.options.length) throw new Error("INVALID_FORM_ANSWER");
    const correct = answerIndex === config.correctIndex;
    const value = correct ? 1 : 0;
    const confidence = 0.84;

    return this.db.transaction(async (tx) => {
      const [attempt] = await tx.insert(exerciseAttempts).values({
        userId,
        exerciseKey,
        exerciseVersion: 1,
        status: "SUBMITTED",
        assistanceLevel: 0,
        difficultySnapshot: { form: 1, spatial: 1 },
        submittedAt: new Date(),
      }).returning({ id: exerciseAttempts.id });
      if (!attempt) throw new Error("FORM_ATTEMPT_CREATE_FAILED");

      const [evidence] = await tx.insert(skillEvidence).values({
        userId,
        skillKey: config.skillKey,
        evidenceType: "STRUCTURAL_EXECUTION",
        dimension: exerciseKey.split(".").at(-1) ?? "form",
        value: value.toFixed(4),
        confidence: confidence.toFixed(4),
        assistanceLevel: 0,
        difficulty: { form: 1, spatial: 1 },
        context: "FORM_LAB",
        sourceType: "exercise_attempt",
        sourceId: attempt.id,
        evaluatorType: "SYSTEM_MEASURED",
        evaluatorVersion: `${exerciseKey}-v1`,
      }).returning({ id: skillEvidence.id });
      if (!evidence) throw new Error("FORM_EVIDENCE_CREATE_FAILED");

      const [previous] = await tx.select({
        masteryScore: learnerSkillStates.masteryScore,
        confidence: learnerSkillStates.confidence,
        evidenceCount: learnerSkillStates.evidenceCount,
      }).from(learnerSkillStates)
        .where(and(eq(learnerSkillStates.userId, userId), eq(learnerSkillStates.skillKey, config.skillKey)))
        .limit(1);

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
        breadth: "0.3000",
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
        payload: { userId, skillKey: config.skillKey, exerciseKey, attemptId: attempt.id, evidenceType: "STRUCTURAL_EXECUTION", correct, context: "FORM_LAB" },
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
