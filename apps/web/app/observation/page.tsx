import { getObservationRepository } from "../../server/runtime";
import { ObservationClient } from "./observation-client";

export const dynamic = "force-dynamic";

export default function ObservationPage() {
  const exercises = getObservationRepository().listExercises();
  return (
    <main className="flow-shell">
      <section className="flow-card observation-card">
        <ObservationClient exercises={exercises} />
      </section>
    </main>
  );
}
