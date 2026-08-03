import { redirect } from "next/navigation";
import { getClosedAlphaFeedbackRepository, getOperationsRepository } from "../../server/runtime";
import { hasOpsSession } from "../../server/ops-session";
import { InviteManager } from "./InviteManager";
import { OpsLogoutButton } from "./OpsLogoutButton";

export const dynamic = "force-dynamic";

const stageOrder = ["ONBOARDING", "DRAWING_ZERO", "FIRST_LESSON", "FIRST_PRACTICE", "FOUNDATION", "ALPHA_GATE", "COMPLETE"];

export default async function OpsPage() {
  if (!(await hasOpsSession())) redirect("/ops/login");

  const [overview, feedback] = await Promise.all([
    getOperationsRepository().getOverview(),
    getClosedAlphaFeedbackRepository().listAllRecent(20),
  ]);

  const onboardingRate = overview.totalTesters > 0 ? Math.round((overview.onboardedTesters / overview.totalTesters) * 100) : 0;
  const activeRate = overview.trackedTesters > 0 ? Math.round((overview.active24h / overview.trackedTesters) * 100) : 0;
  const averageRating = feedback.length > 0 ? (feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(1) : "—";

  return (
    <main className="flow-shell">
      <section className="flow-card" style={{ maxWidth: 1180, margin: "32px auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow">SimpleWay Drawing · Closed Alpha</p>
            <h1 className="flow-title">Control Center</h1>
            <p className="lead compact">Visão operacional do funil, atividade, convites e feedback dos testers.</p>
          </div>
          <OpsLogoutButton />
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 28 }}>
          {[
            ["Testers", overview.totalTesters],
            ["Onboarded", `${overview.onboardedTesters} · ${onboardingRate}%`],
            ["Rastreados", overview.trackedTesters],
            ["Ativos 24h", `${overview.active24h} · ${activeRate}%`],
            ["Feedbacks", feedback.length],
            ["Nota média", averageRating],
          ].map(([label, value]) => (
            <article className="card" key={label} style={{ minHeight: 128 }}>
              <p className="eyebrow">{label}</p>
              <strong style={{ fontSize: 32 }}>{value}</strong>
            </article>
          ))}
        </section>

        <InviteManager />

        <section style={{ marginTop: 36 }}>
          <p className="eyebrow">Funil de ativação</p>
          <div style={{ display: "grid", gap: 10 }}>
            {stageOrder.map((stage) => {
              const count = overview.stages[stage] ?? 0;
              const width = overview.trackedTesters > 0 ? Math.max(2, Math.round((count / overview.trackedTesters) * 100)) : 2;
              return (
                <div key={stage}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong>{stage}</strong><span>{count}</span></div>
                  <div className="learning-progress-track"><span style={{ width: `${width}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ marginTop: 36 }}>
          <p className="eyebrow">Atividade recente</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead><tr><th align="left">Tester</th><th align="left">Etapa</th><th align="left">Última rota</th><th align="right">Heartbeats</th><th align="right">Última atividade</th></tr></thead>
              <tbody>
                {overview.recent.map((item) => (
                  <tr key={item.userId}>
                    <td style={{ padding: "12px 0", borderTop: "1px solid #e5e5df" }}>{item.displayName ?? item.userId.slice(0, 8)}</td>
                    <td style={{ borderTop: "1px solid #e5e5df" }}>{item.stage ?? "—"}</td>
                    <td style={{ borderTop: "1px solid #e5e5df" }}>{item.path ?? "—"}</td>
                    <td align="right" style={{ borderTop: "1px solid #e5e5df" }}>{item.heartbeatCount}</td>
                    <td align="right" style={{ borderTop: "1px solid #e5e5df" }}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(item.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginTop: 36 }}>
          <p className="eyebrow">Feedback recente</p>
          <div style={{ display: "grid", gap: 12 }}>
            {feedback.length === 0 ? <p>Nenhum feedback recebido ainda.</p> : feedback.map((item) => (
              <article className="card" key={item.id} style={{ minHeight: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>{item.category} · {item.rating}/5</strong>
                  <small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(item.createdAt)}</small>
                </div>
                <p>{item.message}</p>
                <small>{item.path ?? "sem rota"} · tester {item.userId?.slice(0, 8) ?? "—"}</small>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
