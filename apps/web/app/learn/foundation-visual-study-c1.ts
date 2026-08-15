export type FoundationVisualStudyDefinition = {
  src: string;
  alt: string;
  caption: string;
};

export const C1_VISUAL_STUDIES: Record<string, FoundationVisualStudyDefinition> = {
  "lesson.swd.c1.how_hand_moves": {
    src: "/studies/c1-joint-scales.svg",
    alt: "Comparação de traços curtos, médios e longos produzidos principalmente pelo pulso, cotovelo e ombro.",
    caption: "Escolha a articulação pela escala do gesto: movimentos maiores pedem mais participação do braço.",
  },
  "lesson.swd.c1.point_to_point": {
    src: "/studies/c0-intentional-line.svg",
    alt: "Origem e destino de uma linha, planejamento do arco, movimento fantasma e execução contínua.",
    caption: "Look · Plan · Ghost · Commit reaparece como fundamento do controle ponto a ponto.",
  },
  "lesson.swd.c1.curve_control": {
    src: "/studies/c1-curve-families.svg",
    alt: "Famílias de curvas C e S abertas, fechadas, suaves e comprimidas, desenhadas como trajetórias inteiras.",
    caption: "Pense a curva como trajetória contínua e evite montá-la com pequenos segmentos hesitantes.",
  },
  "lesson.swd.c1.direction_parallelism": {
    src: "/studies/c1-parallel-rails.svg",
    alt: "Rails mostram uma direção guia, duplicação paralela, convergência acidental e espaçamento consistente.",
    caption: "Paralelismo exige comparar direção e distância ao mesmo tempo.",
  },
  "lesson.swd.c1.pressure_line_weight": {
    src: "/studies/c1-line-weight-taper.svg",
    alt: "Linhas de peso constante e tapers leve para forte e forte para leve, seguidos por peso seletivo em um contorno.",
    caption: "Varie pressão e velocidade por decisão visual, mantendo o gesto contínuo.",
  },
  "lesson.swd.c1.applied_line": {
    src: "/studies/c1-applied-line-economy.svg",
    alt: "Um estudo de sapato passa de excesso de marcas para estrutura, curvas longas e contorno final econômico.",
    caption: "Line economy elimina marcas que não explicam estrutura, direção ou sobreposição.",
  },
};
