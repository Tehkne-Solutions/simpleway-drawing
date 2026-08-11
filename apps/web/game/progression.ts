export type EvidenceDomain = {
  evidenceCount: number;
  masteryScore: number | null;
};

export type PlayerRank = {
  key: "APPRENTICE" | "OBSERVER" | "BUILDER" | "ARTISAN" | "CREATOR" | "MASTER_OF_SIGHT";
  title: string;
  description: string;
  coveredDomains: number;
  totalEvidence: number;
  averageMastery: number | null;
};

export function derivePlayerRank(domains: readonly EvidenceDomain[]): PlayerRank {
  const totalEvidence = domains.reduce((sum, domain) => sum + domain.evidenceCount, 0);
  const covered = domains.filter((domain) => domain.evidenceCount > 0 && domain.masteryScore != null);
  const coveredDomains = covered.length;
  const averageMastery = covered.length
    ? covered.reduce((sum, domain) => sum + (domain.masteryScore ?? 0), 0) / covered.length
    : null;

  const base = { coveredDomains, totalEvidence, averageMastery };
  if (coveredDomains === domains.length && totalEvidence >= 20 && (averageMastery ?? 0) >= 0.85) {
    return { ...base, key: "MASTER_OF_SIGHT", title: "Mestre do Olhar", description: "Você sustenta evidência ampla e domínio alto nos Ateliers medidos." };
  }
  if (coveredDomains === domains.length && (averageMastery ?? 0) >= 0.7) {
    return { ...base, key: "CREATOR", title: "Criador", description: "Você já combina evidência de todos os Ateliers fundamentais com domínio consistente." };
  }
  if (coveredDomains === domains.length) {
    return { ...base, key: "ARTISAN", title: "Artífice", description: "Você já produziu evidência em todos os Ateliers fundamentais. Agora refine estabilidade e transferência." };
  }
  if (coveredDomains >= 2) {
    return { ...base, key: "BUILDER", title: "Construtor", description: "Seu mapa já conecta mais de um domínio. Continue construindo relações entre olhar, gesto e forma." };
  }
  if (coveredDomains === 1) {
    return { ...base, key: "OBSERVER", title: "Observador", description: "Sua primeira evidência real já abriu uma região do Atlas." };
  }
  return { ...base, key: "APPRENTICE", title: "Aprendiz do Olhar", description: "Seu mapa ainda está em branco. A primeira evidência começa a desenhá-lo." };
}
