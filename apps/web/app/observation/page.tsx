import { OBSERVATION_EXERCISES } from "@swd/database";
import { ObservationClient } from "./observation-client";

export const dynamic = "force-dynamic";

export default function ObservationPage() {
  const localUiOnly = process.env.SWD_LOCAL_UI_ONLY === "1";
  const exercises = Object.entries(OBSERVATION_EXERCISES).map(([key, exercise]) => ({
    key,
    title: exercise.title,
    prompt: exercise.prompt,
    options: [...exercise.options],
    skillKey: exercise.skillKey,
    ...(localUiOnly ? { localCorrectIndex: exercise.correctIndex, localExplanation: exercise.explanation } : {}),
  }));

  return (
    <main className="flow-shell">
      <section className="flow-card observation-card">
        <ObservationClient exercises={exercises} localUiOnly={localUiOnly} />
      </section>
    </main>
  );
}
