export const CROMA_CANON = {
  name: "Croma di Vinci",
  shortName: "Croma",
  title: "Herdeiro do Olhar",
  lineage: "Camaleões do Olhar",
  society: "Sociedade Croma",
  motto: "Prima osserva. Poi crea.",
  mottoPt: "Primeiro observe. Depois crie.",
  playerTitle: "Aprendiz do Olhar",
  codex: "Codex Croma",
  atlas: "Atlas do Olhar",
  note: "Lenda ficcional do universo SimpleWay Drawing, inspirada pelo espírito investigativo do Renascimento.",
} as const;

export const SWD_ATELIERS = [
  { key: "gesture", name: "Atelier do Gesto", short: "Gesto", href: "/gym", pigment: "terracotta", purpose: "Controle, ritmo e intenção do movimento." },
  { key: "sight", name: "Atelier do Olhar", short: "Olhar", href: "/observation", pigment: "ultramarine", purpose: "Proporção, ângulo, alinhamento e percepção." },
  { key: "structure", name: "Atelier da Estrutura", short: "Estrutura", href: "/construction", pigment: "veronese", purpose: "Shapes, construção e relações estruturais." },
  { key: "volume", name: "Atelier do Volume", short: "Volume", href: "/form", pigment: "violet", purpose: "Formas tridimensionais, rotação e espaço." },
  { key: "free", name: "Atelier Livre", short: "Atelier", href: "/create", pigment: "gold", purpose: "Criação, experimentação e projetos autorais." },
  { key: "atlas", name: "Atlas do Olhar", short: "Atlas", href: "/journey", pigment: "sepia", purpose: "Evidências, marcos e evolução do artista." },
] as const;

export const ARTIST_RANKS = [
  { key: "apprentice", title: "Aprendiz do Olhar", minEvidence: 0 },
  { key: "observer", title: "Observador", minEvidence: 8 },
  { key: "builder", title: "Construtor", minEvidence: 20 },
  { key: "artisan", title: "Artífice", minEvidence: 40 },
  { key: "creator", title: "Criador", minEvidence: 70 },
  { key: "master", title: "Mestre do Olhar", minEvidence: 110 },
] as const;
