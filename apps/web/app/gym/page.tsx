import { IntentionalLineClient } from "./intentional-line-client";

export const dynamic = "force-dynamic";

export default function GymPage() {
  return (
    <main className="flow-shell">
      <section className="flow-card gym-card">
        <IntentionalLineClient />
      </section>
    </main>
  );
}
