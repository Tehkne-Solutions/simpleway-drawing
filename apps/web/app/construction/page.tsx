import { getConstructionRepository } from "../../server/runtime";
import { ConstructionClient } from "./construction-client";

export const dynamic = "force-dynamic";

export default function ConstructionPage() {
  const exercises = getConstructionRepository().listExercises();
  return (
    <main className="flow-shell">
      <section className="flow-card construction-card">
        <ConstructionClient exercises={exercises} />
      </section>
    </main>
  );
}
