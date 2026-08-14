export type AtlasEvidenceState = {
  skillKey: string;
  masteryScore: number | null;
  masteryLevel: string | null;
  evidenceCount: number;
};

export type PixelAtlasSnapshot = {
  completedMissionIds: string[];
  completedCount: number;
  complete: boolean;
  evidence: AtlasEvidenceState[];
};

export type StudioAtlasSnapshot = {
  completedMissionIds: string[];
  evidence: AtlasEvidenceState[];
};

export type CreativeTerritoryKey = "synthesis" | "narrative" | "structure";

export type CreativeTerritory = {
  key: CreativeTerritoryKey;
  title: string;
  discipline: string;
  description: string;
  href: string;
  glyph: string;
  reward: string;
  complete: boolean;
  progress: number;
  completedSteps: number;
  totalSteps: number;
  evidenceCount: number;
  masteryScore: number | null;
  masteryLevel: string | null;
  skillKeys: string[];
};

function averageMastery(states: AtlasEvidenceState[]): number | null {
  const measured = states.filter((state) => state.masteryScore != null);
  if (!measured.length) return null;
  return measured.reduce((sum, state) => sum + (state.masteryScore ?? 0), 0) / measured.length;
}

function masteryLevel(states: AtlasEvidenceState[]): string | null {
  const measured = states.filter((state) => state.masteryScore != null).sort((a, b) => (b.masteryScore ?? 0) - (a.masteryScore ?? 0));
  return measured[0]?.masteryLevel ?? null;
}

export function deriveCreativeTerritories(pixel: PixelAtlasSnapshot, studio: StudioAtlasSnapshot): CreativeTerritory[] {
  const pixelEvidence = pixel.evidence.filter((state) => state.skillKey.startsWith("skill.drawing.creative."));
  const manga = studio.evidence.find((state) => state.skillKey === "skill.drawing.creative.manga_head_construction") ?? null;
  const isometric = studio.evidence.find((state) => state.skillKey === "skill.drawing.creative.isometric_construction") ?? null;

  return [
    {
      key: "synthesis",
      title: "Santuário da Síntese",
      discipline: "Pixel · Movimento · Continuidade · Tempo",
      description: "Quatro leis do pixel formam um único emblema quando a Expedição é demonstrada com Evidence.",
      href: "/create/pixel/quest",
      glyph: "▦",
      reward: "Emblema da Síntese",
      complete: pixel.complete,
      progress: pixel.completedCount / 4,
      completedSteps: pixel.completedCount,
      totalSteps: 4,
      evidenceCount: pixelEvidence.reduce((sum, state) => sum + state.evidenceCount, 0),
      masteryScore: averageMastery(pixelEvidence),
      masteryLevel: masteryLevel(pixelEvidence),
      skillKeys: pixelEvidence.map((state) => state.skillKey),
    },
    {
      key: "narrative",
      title: "Arquivo das Vistas",
      discipline: "Manga · Construção de cabeça",
      description: "Frente, três-quartos e perfil deixam de ser imagens isoladas e se tornam uma construção coerente em múltiplas vistas.",
      href: "/create/manga",
      glyph: "頭",
      reward: "Sigilo das Vistas",
      complete: studio.completedMissionIds.includes("manga"),
      progress: studio.completedMissionIds.includes("manga") ? 1 : 0,
      completedSteps: studio.completedMissionIds.includes("manga") ? 1 : 0,
      totalSteps: 1,
      evidenceCount: manga?.evidenceCount ?? 0,
      masteryScore: manga?.masteryScore ?? null,
      masteryLevel: manga?.masteryLevel ?? null,
      skillKeys: manga ? [manga.skillKey] : ["skill.drawing.creative.manga_head_construction"],
    },
    {
      key: "structure",
      title: "Prisma dos Três Eixos",
      discipline: "Isométrico · 30° / 90° / 150°",
      description: "O espaço bidimensional ganha volume quando os três eixos são construídos como um sistema, não como linhas soltas.",
      href: "/create/isometric",
      glyph: "◇",
      reward: "Sigilo dos Eixos",
      complete: studio.completedMissionIds.includes("isometric"),
      progress: studio.completedMissionIds.includes("isometric") ? 1 : 0,
      completedSteps: studio.completedMissionIds.includes("isometric") ? 1 : 0,
      totalSteps: 1,
      evidenceCount: isometric?.evidenceCount ?? 0,
      masteryScore: isometric?.masteryScore ?? null,
      masteryLevel: isometric?.masteryLevel ?? null,
      skillKeys: isometric ? [isometric.skillKey] : ["skill.drawing.creative.isometric_construction"],
    },
  ];
}

export function creativeWorldSummary(territories: readonly CreativeTerritory[]) {
  const completed = territories.filter((territory) => territory.complete).length;
  const evidenceCount = territories.reduce((sum, territory) => sum + territory.evidenceCount, 0);
  const measured = territories.filter((territory) => territory.masteryScore != null);
  return {
    completed,
    total: territories.length,
    evidenceCount,
    complete: completed === territories.length,
    averageMastery: measured.length ? measured.reduce((sum, territory) => sum + (territory.masteryScore ?? 0), 0) / measured.length : null,
  };
}

export function nextAtlasMission(
  foundationComplete: boolean,
  foundationNext: { title: string; description: string; href: string },
  territories: readonly CreativeTerritory[],
) {
  const activeCreative = territories.find((territory) => !territory.complete && territory.evidenceCount > 0) ?? null;
  const creativeNext = activeCreative ?? territories.find((territory) => !territory.complete) ?? null;
  if (activeCreative) return { title: activeCreative.title, description: `Continue o território criativo: ${activeCreative.description}`, href: activeCreative.href, kind: "creative" as const };
  if (!foundationComplete) return { ...foundationNext, kind: "foundation" as const };
  if (creativeNext) return { title: creativeNext.title, description: `Abra um novo território criativo: ${creativeNext.description}`, href: creativeNext.href, kind: "creative" as const };
  return { title: "Câmara da Obra", description: "Os territórios medidos estão abertos. Use as habilidades juntas em uma criação autoral.", href: "/create/work", kind: "capstone" as const };
}
