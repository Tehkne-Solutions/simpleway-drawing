import { OBSERVATION_EXERCISES } from "@swd/database";
import { normalizeLearningReturnTo } from "../../server/learning-return";
import { ObservationClient } from "./observation-client";

export const dynamic = "force-dynamic";

export default async function ObservationPage({ searchParams }: { searchParams: Promise<{ exercise?: string; returnTo?: string }> }) {
  const params = await searchParams;
  const localUiOnly = process.env.SWD_LOCAL_UI_ONLY === "1";
  const exercises = Object.entries(OBSERVATION_EXERCISES).map(([key, exercise]) => ({
    key,
    title: exercise.title,
    prompt: exercise.prompt,
    options: [...exercise.options],
    skillKey: exercise.skillKey,
    ...(localUiOnly ? { localCorrectIndex: exercise.correctIndex, localExplanation: exercise.explanation } : {}),
  }));
  const initialExerciseKey = exercises.some((exercise) => exercise.key === params.exercise) ? params.exercise ?? null : null;
  const returnTo = normalizeLearningReturnTo(params.returnTo);

  return (
    <main className="flow-shell">
      <section className="flow-card observation-card">
        <ObservationClient exercises={exercises} localUiOnly={localUiOnly} initialExerciseKey={initialExerciseKey} returnTo={returnTo} />
      </section>
    </main>
  );
}
