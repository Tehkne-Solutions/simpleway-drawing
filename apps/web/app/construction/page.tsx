import { CONSTRUCTION_EXERCISES } from "@swd/database";
import { normalizeLearningReturnTo } from "../../server/learning-return";
import { ConstructionClient } from "./construction-client";

export const dynamic = "force-dynamic";

export default async function ConstructionPage({ searchParams }: { searchParams: Promise<{ exercise?: string; returnTo?: string }> }) {
  const params = await searchParams;
  const exercises = Object.entries(CONSTRUCTION_EXERCISES).map(([key, exercise]) => ({
    key,
    title: exercise.title,
    prompt: exercise.prompt,
    options: [...exercise.options],
    skillKey: exercise.skillKey,
  }));
  const initialExerciseKey = exercises.some((exercise) => exercise.key === params.exercise) ? params.exercise ?? null : null;
  const returnTo = normalizeLearningReturnTo(params.returnTo);

  return (
    <main className="flow-shell">
      <section className="flow-card construction-card">
        <ConstructionClient exercises={exercises} initialExerciseKey={initialExerciseKey} returnTo={returnTo} />
      </section>
    </main>
  );
}
