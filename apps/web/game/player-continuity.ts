import { creativeWorldSummary, nextAtlasMission, type CreativeTerritory } from "./atlas-world";

export type ActivationContinuity = {
  stage: string;
  completedSteps: number;
  totalSteps: number;
  progress: number;
  nextAction: { title: string; description: string; href: string };
};

export type PlayerContinuityPhase = "FOUNDATION" | "CREATIVE_WORLD" | "AUTHORING";

export type PlayerContinuity = {
  phase: PlayerContinuityPhase;
  phaseTitle: string;
  phaseDescription: string;
  nextAction: { title: string; description: string; href: string; kind: "foundation" | "creative" | "capstone" };
  focusProgress: number;
  foundationProgress: number;
  creativeProgress: number;
  completedMilestones: number;
  totalMilestones: number;
  worldProgress: number;
  territories: CreativeTerritory[];
  creative: ReturnType<typeof creativeWorldSummary>;
};

export function derivePlayerContinuity(activation: ActivationContinuity, territories: CreativeTerritory[]): PlayerContinuity {
  const foundationComplete = activation.stage === "COMPLETE";
  const creative = creativeWorldSummary(territories);
  const creativeProgress = creative.total > 0 ? creative.completed / creative.total : 0;
  const completedMilestones = activation.completedSteps + creative.completed;
  const totalMilestones = activation.totalSteps + creative.total;
  const worldProgress = totalMilestones > 0 ? completedMilestones / totalMilestones : 0;

  if (!foundationComplete) {
    return {
      phase: "FOUNDATION",
      phaseTitle: "Campanha Foundation",
      phaseDescription: "Sua rota principal ainda está no arco de fundamentos. Os Ateliers continuam livres para exploração.",
      nextAction: { ...activation.nextAction, kind: "foundation" },
      focusProgress: activation.progress,
      foundationProgress: activation.progress,
      creativeProgress,
      completedMilestones,
      totalMilestones,
      worldProgress,
      territories,
      creative,
    };
  }

  const atlasMission = nextAtlasMission(true, activation.nextAction, territories);
  if (!creative.complete) {
    return {
      phase: "CREATIVE_WORLD",
      phaseTitle: "Territórios Criativos",
      phaseDescription: "A Foundation está demonstrada. Agora transforme domínio técnico em linguagem própria nos santuários criativos.",
      nextAction: atlasMission,
      focusProgress: creativeProgress,
      foundationProgress: 1,
      creativeProgress,
      completedMilestones,
      totalMilestones,
      worldProgress,
      territories,
      creative,
    };
  }

  return {
    phase: "AUTHORING",
    phaseTitle: "Câmara da Obra",
    phaseDescription: "Foundation e territórios medidos estão abertos. O próximo passo é combinar habilidades em criação autoral.",
    nextAction: atlasMission,
    focusProgress: 1,
    foundationProgress: 1,
    creativeProgress: 1,
    completedMilestones,
    totalMilestones,
    worldProgress,
    territories,
    creative,
  };
}
