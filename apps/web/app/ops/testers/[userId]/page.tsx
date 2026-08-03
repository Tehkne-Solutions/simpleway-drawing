import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOperationsRepository } from "../../../../server/runtime";
import { hasOpsSession } from "../../../../server/ops-session";

export const dynamic = "force-dynamic";

export default async function TesterDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  if (!(await hasOpsSession())) redirect("/ops/login");
  const { userId } = await params;
  const tester = await getOperationsRepository().getTesterSnapshot(userId);
  if (!tester) notFound();

  const date = (value: Date | null) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value) : "—";

  return (
    <main className="flow-shell">
      <section className="flow-card" style={{ maxWidth: 940, margin: "32px auto" }}>
        <p className="eyebrow">SimpleWay Drawing · Closed Alpha</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <h1 className="flow-title">{tester.displayName ?? `Tester ${tester.userId.slice(0, 8)}`}</h1>
            <p className="lead compact">Visão operacional mínima para suporte ao participante.</p>
          </div>
          <Link className="secondary" href="/ops">Voltar ao Control Center</Link>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 28 }}>
          {[
            ["Cohort", tester.cohortLabel ?? "Sem convite"],
            ["Etapa", tester.stage ?? "Sem progresso"],
            ["Trilha", tester.preferredPath ?? "—"],
            ["Experiência", tester.experienceLevel ?? "—"],
            ["Objetivo", tester.primaryGoal ?? "—"],
            ["Sessões", tester.sessionCount],
            ["Heartbeats", tester.heartbeatCount],
            ["Evidence", tester.evidenceCount],
            ["Artworks", tester.artworkCount],
            ["Feedbacks", tester.feedbackCount],
            ["Nota média", tester.averageRating ?? "—"],
          ].map(([label, value]) => <article className="card" key={label} style={{ minHeight: 110 }}><p className="eyebrow">{label}</p><strong style={{ fontSize: 24 }}>{value}</strong></article>)}
        </section>

        <section className="card" style={{ marginTop: 24, minHeight: 0 }}>
          <p className="eyebrow">Atividade</p>
          <p><strong>Primeira sessão:</strong> {date(tester.firstSeenAt)}</p>
          <p><strong>Última atividade:</strong> {date(tester.lastSeenAt)}</p>
          <p><strong>Última rota:</strong> {tester.lastPath ?? "—"}</p>
        </section>

        <p style={{ marginTop: 18, opacity: .7, fontSize: 13 }}>Esta visão não exibe arquivos enviados, conteúdo de desenhos ou metadata bruta do dispositivo. · Tehkné Solutions</p>
      </section>
    </main>
  );
}
