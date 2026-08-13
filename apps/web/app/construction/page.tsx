import { CONSTRUCTION_EXERCISES } from "@swd/database";
import { ConstructionClient } from "./construction-client";

export const dynamic = "force-dynamic";

export default function ConstructionPage() {
  const exercises = Object.entries(CONSTRUCTION_EXERCISES).map(([key, exercise]) => ({
    key,
    title: exercise.title,
    prompt: exercise.prompt,
    options: [...exercise.options],
    skillKey: exercise.skillKey,
  }));

  return (
    <main className="flow-shell">
      <section className="flow-card construction-card">
        <ConstructionClient exercises={exercises} />
      </section>
    </main>
  );
}
