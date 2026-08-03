import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../client";
import { artworks, profiles, skillEvidence } from "../schema/core";
import { cycleProgress, lessonProgress } from "../schema/learning";
import { journeyEntries } from "../schema/journey";
import {
  C0_CYCLE_KEY,
  C0_LESSON_KEYS,
  C1_CYCLE_KEY,
  C1_LESSON_KEYS,
  C2_CYCLE_KEY,
  C2_LESSON_KEYS,
  C3_CYCLE_KEY,
  C3_LESSON_KEYS,
  C4_CYCLE_KEY,
  C4_LESSON_KEYS,
} from "./learning-progress";

export type ActivationStage =
  | "ONBOARDING"
  | "DRAWING_ZERO"
  | "FIRST_LESSON"
  | "FIRST_PRACTICE"
  | "FOUNDATION"
  | "ALPHA_GATE"
  | "COMPLETE";

export type ActivationStep = {
  key: ActivationStage;
  title: string;
  complete: boolean;
};

export type ActivationSnapshot = {
  stage: ActivationStage;
  completedSteps: number;
  totalSteps: number;
  progress: number;
  steps: ActivationStep[];
  nextAction: { title: string; description: string; href: string };
  lastCompletedLessonKey: string | null;
  nextLessonKey: string | null;
};

const FOUNDATION_LESSONS = [
  ...C0_LESSON_KEYS,
  ...C1_LESSON_KEYS,
  ...C2_LESSON_KEYS,
  ...C3_LESSON_KEYS,
  ...C4_LESSON_KEYS,
] as const;

const CYCLE_FOR_LESSON: Array<{ prefix: string; segment: string }> = [
  { prefix: "lesson.swd.c0.", segment: "c0" },
  { prefix: "lesson.swd.c1.", segment: "c1" },
  { prefix: "lesson.swd.c2.", segment: "c2" },
  { prefix: "lesson.swd.c3.", segment: "c3" },
  { prefix: "lesson.swd.c4.", segment: "c4" },
];

function lessonHref(lessonKey: string): string {
  const cycle = CYCLE_FOR_LESSON.find((item) => lessonKey.startsWith(item.prefix));
  return cycle ? `/learn/${cycle.segment}/${lessonKey}` : "/learn";
}

export class DrizzleActivationRepository {
  constructor(private readonly db: Database) {}

  async getSnapshot(userId: string): Promise<ActivationSnapshot> {
    const [profile] = await this.db
      .select({ onboardingCompletedAt: profiles.onboardingCompletedAt })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    const [baseline] = await this.db
      .select({ id: artworks.id })
      .from(artworks)
      .where(and(eq(artworks.ownerUserId, userId), eq(artworks.type, "BASELINE")))
      .limit(1);

    const completedLessonRows = await this.db
      .select({ lessonKey: lessonProgress.lessonKey, completedAt: lessonProgress.completedAt })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "COMPLETED")));

    const completedLessons = new Set(completedLessonRows.map((row) => row.lessonKey));
    const completedFoundationLessons = FOUNDATION_LESSONS.filter((key) => completedLessons.has(key));
    const lastCompleted = [...completedLessonRows]
      .filter((row) => row.completedAt)
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))[0]?.lessonKey ?? null;
    const nextLessonKey = FOUNDATION_LESSONS.find((key) => !completedLessons.has(key)) ?? null;

    const [evidence] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(skillEvidence)
      .where(eq(skillEvidence.userId, userId));

    const [c4] = await this.db
      .select({ status: cycleProgress.status })
      .from(cycleProgress)
      .where(and(eq(cycleProgress.userId, userId), eq(cycleProgress.cycleKey, C4_CYCLE_KEY)))
      .limit(1);

    const [alphaGate] = await this.db
      .select({ id: journeyEntries.id })
      .from(journeyEntries)
      .where(and(eq(journeyEntries.userId, userId), eq(journeyEntries.type, "ALPHA_GATE")))
      .limit(1);

    const onboardingComplete = Boolean(profile?.onboardingCompletedAt);
    const drawingZeroComplete = Boolean(baseline);
    const firstLessonComplete = completedFoundationLessons.length > 0;
    const firstPracticeComplete = (evidence?.count ?? 0) > 0;
    const foundationComplete = c4?.status === "COMPLETED";
    const gateComplete = Boolean(alphaGate);

    const steps: ActivationStep[] = [
      { key: "ONBOARDING", title: "Definir seu ponto de partida", complete: onboardingComplete },
      { key: "DRAWING_ZERO", title: "Registrar o Drawing Zero", complete: drawingZeroComplete },
      { key: "FIRST_LESSON", title: "Concluir a primeira lição", complete: firstLessonComplete },
      { key: "FIRST_PRACTICE", title: "Gerar a primeira Evidence", complete: firstPracticeComplete },
      { key: "FOUNDATION", title: "Concluir C0–C4", complete: foundationComplete },
      { key: "ALPHA_GATE", title: "Concluir o Alpha Gate", complete: gateComplete },
    ];

    let stage: ActivationStage;
    let nextAction: ActivationSnapshot["nextAction"];

    if (!onboardingComplete) {
      stage = "ONBOARDING";
      nextAction = { title: "Definir meu ponto de partida", description: "Conte sua direção, experiência e objetivo antes de iniciar.", href: "/onboarding" };
    } else if (!drawingZeroComplete) {
      stage = "DRAWING_ZERO";
      nextAction = { title: "Fazer meu Drawing Zero", description: "Registre seu baseline antes das primeiras correções.", href: "/drawing-zero" };
    } else if (!firstLessonComplete) {
      stage = "FIRST_LESSON";
      nextAction = { title: "Começar minha primeira lição", description: "Entre no C0 e aprenda o loop HNK de observar, tentar e corrigir.", href: lessonHref(C0_LESSON_KEYS[0]) };
    } else if (!firstPracticeComplete) {
      stage = "FIRST_PRACTICE";
      nextAction = { title: "Fazer minha primeira prática", description: "Transforme aprendizado em Evidence mensurável no Gym.", href: "/gym" };
    } else if (!foundationComplete) {
      stage = "FOUNDATION";
      nextAction = nextLessonKey
        ? { title: "Continuar de onde parei", description: "Retome a próxima lição incompleta da Foundation.", href: lessonHref(nextLessonKey) }
        : { title: "Continuar a Foundation", description: "Finalize C0–C4 para chegar ao Alpha Gate.", href: "/learn" };
    } else if (!gateComplete) {
      stage = "ALPHA_GATE";
      nextAction = { title: "Fechar meu Alpha", description: "Complete Revisit, Capstone e o diagnóstico integrado do Alpha Gate.", href: "/alpha" };
    } else {
      stage = "COMPLETE";
      nextAction = { title: "Revisar minha evolução", description: "Sua Foundation Alpha está concluída. Veja seu Before/After e próximos focos.", href: "/journey" };
    }

    const completedSteps = steps.filter((step) => step.complete).length;
    return {
      stage,
      completedSteps,
      totalSteps: steps.length,
      progress: completedSteps / steps.length,
      steps,
      nextAction,
      lastCompletedLessonKey: lastCompleted,
      nextLessonKey,
    };
  }
}
