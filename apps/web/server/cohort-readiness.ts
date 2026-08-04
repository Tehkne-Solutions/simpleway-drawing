export type CohortReadinessInput = {
  maxUses: number;
  redeemed: number;
  onboarded: number;
  active7d: number;
  completed: number;
  feedbackCount: number;
  averageRating: number | null;
};

export type CohortReadiness = {
  state: "READY" | "WATCH" | "HOLD" | "COMPLETE";
  phase: "PRELAUNCH" | "ACTIVATION" | "ACTIVE" | "COMPLETION";
  remainingCapacity: number;
  reasons: string[];
  nextAction: string;
};

export function evaluateCohortReadiness(input: CohortReadinessInput): CohortReadiness {
  const remainingCapacity = Math.max(0, input.maxUses - input.redeemed);
  const activationRate = input.redeemed > 0 ? Math.round((input.onboarded / input.redeemed) * 100) : 0;
  const activeRate = input.redeemed > 0 ? Math.round((input.active7d / input.redeemed) * 100) : 0;
  const completionRate = input.redeemed > 0 ? Math.round((input.completed / input.redeemed) * 100) : 0;

  if (input.redeemed === 0) {
    return {
      state: remainingCapacity > 0 ? "READY" : "HOLD",
      phase: "PRELAUNCH",
      remainingCapacity,
      reasons: remainingCapacity > 0 ? [`${remainingCapacity} vaga(s) disponível(is)`] : ["nenhuma vaga disponível"],
      nextAction: remainingCapacity > 0 ? "Distribuir os links individuais da cohort." : "Criar um novo lote de convites antes do lançamento.",
    };
  }

  if (input.completed === input.redeemed && remainingCapacity === 0) {
    return {
      state: "COMPLETE",
      phase: "COMPLETION",
      remainingCapacity,
      reasons: ["todos os testers que entraram concluíram a jornada"],
      nextAction: input.feedbackCount < input.redeemed ? "Coletar o feedback final restante e encerrar a cohort." : "Consolidar aprendizados e preparar a próxima cohort.",
    };
  }

  if (input.redeemed >= 3 && (activationRate < 35 || activeRate < 25)) {
    const reasons = [];
    if (activationRate < 35) reasons.push(`onboarding baixo (${activationRate}%)`);
    if (activeRate < 25) reasons.push(`atividade 7d baixa (${activeRate}%)`);
    return {
      state: "HOLD",
      phase: activationRate < 35 ? "ACTIVATION" : "ACTIVE",
      remainingCapacity,
      reasons,
      nextAction: "Interromper novos convites e tratar os blockers dos testers atuais.",
    };
  }

  if (input.redeemed >= 2 && (activationRate < 60 || activeRate < 50)) {
    const reasons = [];
    if (activationRate < 60) reasons.push(`onboarding em observação (${activationRate}%)`);
    if (activeRate < 50) reasons.push(`atividade 7d em observação (${activeRate}%)`);
    return {
      state: "WATCH",
      phase: activationRate < 60 ? "ACTIVATION" : "ACTIVE",
      remainingCapacity,
      reasons,
      nextAction: "Manter a cohort atual, apoiar testers e revisar novamente antes de ampliar o lote.",
    };
  }

  if (completionRate >= 70) {
    return {
      state: "READY",
      phase: "COMPLETION",
      remainingCapacity,
      reasons: [`conclusão forte (${completionRate}%)`, `${input.feedbackCount} feedback(s) recebido(s)`],
      nextAction: remainingCapacity > 0 ? "Finalizar os testers atuais antes de distribuir as vagas restantes." : "Coletar feedback final e preparar a próxima cohort.",
    };
  }

  return {
    state: "READY",
    phase: input.onboarded < input.redeemed ? "ACTIVATION" : "ACTIVE",
    remainingCapacity,
    reasons: [
      `onboarding ${activationRate}%`,
      `atividade 7d ${activeRate}%`,
      ...(input.averageRating === null ? [] : [`nota média ${input.averageRating}`]),
    ],
    nextAction: remainingCapacity > 0 ? "A cohort pode continuar recebendo os convites restantes." : "Acompanhar progresso e feedback até a conclusão.",
  };
}
