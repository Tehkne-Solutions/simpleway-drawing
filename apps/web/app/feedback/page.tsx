import { FeedbackClient } from "./feedback-client";

export const dynamic = "force-dynamic";

export default function FeedbackPage() {
  return (
    <main className="flow-shell">
      <section className="flow-card feedback-card">
        <p className="eyebrow">Closed Alpha · Feedback</p>
        <h1 className="flow-title">Conte o que aconteceu enquanto ainda está fresco.</h1>
        <p className="lead compact">Seu relato fica ligado apenas à sua sessão do Alpha e não altera Mastery, Evidence nem a avaliação da sua arte.</p>
        <FeedbackClient />
      </section>
    </main>
  );
}
