import type { AlphaFeedbackRecord } from "@swd/database";
import type { TesterIntervention } from "@swd/database";

export type LaunchIncidentSeverity = "P0" | "P1" | "P2";
export type LaunchDecision = "GO" | "WATCH" | "STOP";

export type LaunchIncident = {
  id: string;
  severity: LaunchIncidentSeverity;
  source: "FEEDBACK" | "INTERVENTION";
  title: string;
  detail: string;
  userId: string | null;
  createdAt: Date | null;
};

export type LaunchIncidentSummary = {
  decision: LaunchDecision;
  incidents: LaunchIncident[];
  counts: Record<LaunchIncidentSeverity, number>;
  reasons: string[];
  nextAction: string;
};

function feedbackIncident(item: AlphaFeedbackRecord): LaunchIncident | null {
  const userId = item.userId ?? null;
  if (item.category === "BUG" && item.rating === 1) {
    return { id: `feedback:${item.id}`, severity: "P0", source: "FEEDBACK", title: "Bug crítico reportado", detail: item.message, userId, createdAt: item.createdAt };
  }
  if (item.category === "BUG" && item.rating <= 2) {
    return { id: `feedback:${item.id}`, severity: "P1", source: "FEEDBACK", title: "Bug de alta severidade", detail: item.message, userId, createdAt: item.createdAt };
  }
  if (item.category === "USABILITY" && item.rating === 1) {
    return { id: `feedback:${item.id}`, severity: "P1", source: "FEEDBACK", title: "Bloqueio grave de usabilidade", detail: item.message, userId, createdAt: item.createdAt };
  }
  if (item.rating <= 2) {
    return { id: `feedback:${item.id}`, severity: "P2", source: "FEEDBACK", title: "Feedback negativo relevante", detail: item.message, userId, createdAt: item.createdAt };
  }
  return null;
}

function interventionIncidents(interventions: TesterIntervention[]): LaunchIncident[] {
  const high = interventions.filter((item) => item.priority === "HIGH");
  const incidents: LaunchIncident[] = [];

  if (high.length >= 2) {
    incidents.push({
      id: "intervention:high-cluster",
      severity: "P1",
      source: "INTERVENTION",
      title: "Concentração de testers em risco",
      detail: `${high.length} testers estão simultaneamente com prioridade HIGH na fila de intervenção.`,
      userId: null,
      createdAt: null,
    });
  } else if (high.length === 1) {
    const item = high[0];
    if (item) incidents.push({
      id: `intervention:${item.userId}`,
      severity: "P2",
      source: "INTERVENTION",
      title: "Tester requer suporte prioritário",
      detail: item.reasons.join(" · "),
      userId: item.userId,
      createdAt: item.lastSeenAt,
    });
  }

  return incidents;
}

export function evaluateLaunchIncidents(input: {
  feedback: AlphaFeedbackRecord[];
  interventions: TesterIntervention[];
}): LaunchIncidentSummary {
  const incidents = [
    ...input.feedback.map(feedbackIncident).filter((item): item is LaunchIncident => item !== null),
    ...interventionIncidents(input.interventions),
  ].sort((a, b) => ({ P0: 3, P1: 2, P2: 1 }[b.severity] - { P0: 3, P1: 2, P2: 1 }[a.severity]));

  const counts = {
    P0: incidents.filter((item) => item.severity === "P0").length,
    P1: incidents.filter((item) => item.severity === "P1").length,
    P2: incidents.filter((item) => item.severity === "P2").length,
  };

  const decision: LaunchDecision = counts.P0 > 0 || counts.P1 > 0 ? "STOP" : counts.P2 > 0 ? "WATCH" : "GO";
  const reasons = [
    ...(counts.P0 ? [`${counts.P0} incidente(s) P0`] : []),
    ...(counts.P1 ? [`${counts.P1} incidente(s) P1`] : []),
    ...(counts.P2 ? [`${counts.P2} incidente(s) P2`] : []),
  ];

  return {
    decision,
    incidents,
    counts,
    reasons: reasons.length ? reasons : ["Nenhum incidente de lançamento detectado."],
    nextAction: decision === "STOP"
      ? "Congelar novos convites e resolver P0/P1 antes de ampliar a cohort."
      : decision === "WATCH"
        ? "Manter a cohort atual, tratar P2 e observar nova atividade antes de ampliar."
        : "Operação estável; expansão continua sujeita ao Production Launch Gate e ao readiness da cohort.",
  };
}
