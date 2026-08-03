import { getFormRepository } from "../../server/runtime";
import { FormClient } from "./form-client";

export const dynamic = "force-dynamic";

export default function FormPage() {
  const exercises = getFormRepository().listExercises();
  return (
    <main className="flow-shell">
      <section className="flow-card form-card">
        <FormClient exercises={exercises} />
      </section>
    </main>
  );
}
