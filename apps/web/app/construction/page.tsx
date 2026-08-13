import { CONSTRUCTION_EXERCISES } from "@swd/database";
import { ConstructionClient } from "./construction-client";

export const dynamic = "force-dynamic";

export default function ConstructionPage() {
  const localUiOnly = process.env.SWD_LOCAL_UI_ONLY === "1";
  const exercises = Object.entries(CONSTRUCTION_EXERCISES).map(([key, exercise]) => ({
    key,
    title: exercise.title,
    prompt: exercise.prompt,
    options: [...exercise.options],
    skillKey: exercise.skillKey,
    ...(localUiOnly ? { localCorrectIndex: exercise.correctIndex, localExplanation: exercise.explanation } : {}),
  }));

  return (
    <main className="flow-shell">
      <section className="flow-card construction-card">
        <ConstructionClient exercises={exercises} localUiOnly={localUiOnly} />
      </section>
    </main>
  );
}
