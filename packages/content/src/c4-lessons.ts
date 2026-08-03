const pt = (value: string) => ({ "pt-BR": value });

export const C4_LESSONS = [
  {
    key: "lesson.swd.c4.volume_mindset",
    version: 1,
    unitKey: "unit.swd.c4.volume_mindset",
    title: pt("De shape para volume"),
    objective: pt("Pensar em largura, altura e profundidade ao mesmo tempo."),
    estimatedActiveMinutes: 8,
    blocks: [
      { type: "HOOK" as const, text: pt("Uma forma 2D ocupa a página; uma forma 3D parece ocupar espaço.") },
      { type: "TEXT" as const, title: pt("Toda forma tem direção"), text: pt("Para pensar em volume, procure eixo, planos, frente, trás e como a forma continuaria se você pudesse girá-la.") },
    ],
  },
  {
    key: "lesson.swd.c4.boxes",
    version: 1,
    unitKey: "unit.swd.c4.boxes",
    title: pt("Caixas organizam o espaço"),
    objective: pt("Usar caixas para estabelecer orientação, planos e profundidade."),
    estimatedActiveMinutes: 11,
    blocks: [
      { type: "PRACTICE" as const, exerciseKey: "exercise.swd.form.box_orientation", title: pt("Box Orientation"), text: pt("Escolha a caixa cuja orientação corresponde ao conjunto de planos mostrado.") },
    ],
  },
  {
    key: "lesson.swd.c4.cylinders",
    version: 1,
    unitKey: "unit.swd.c4.cylinders",
    title: pt("Cilindros e eixos"),
    objective: pt("Construir cilindros coerentes a partir de eixo e extremidades."),
    estimatedActiveMinutes: 11,
    blocks: [
      { type: "TEXT" as const, text: pt("Um cilindro coerente nasce de um eixo comum. As elipses das extremidades precisam pertencer ao mesmo volume.") },
      { type: "PRACTICE" as const, exerciseKey: "exercise.swd.form.cylinder_axis", title: pt("Cylinder Axis"), text: pt("Identifique qual cilindro mantém eixo e extremidades consistentes.") },
    ],
  },
  {
    key: "lesson.swd.c4.ellipses_space",
    version: 1,
    unitKey: "unit.swd.c4.ellipses_space",
    title: pt("Elipses descrevem planos"),
    objective: pt("Interpretar abertura e orientação de elipses como informação espacial."),
    estimatedActiveMinutes: 10,
    blocks: [
      { type: "PRACTICE" as const, exerciseKey: "exercise.swd.form.ellipse_plane", title: pt("Ellipse Plane"), text: pt("Escolha a elipse que melhor descreve o plano indicado.") },
    ],
  },
  {
    key: "lesson.swd.c4.cross_contours",
    version: 1,
    unitKey: "unit.swd.c4.cross_contours",
    title: pt("Cross-contours revelam superfície"),
    objective: pt("Usar linhas de contorno transversal para mostrar como a superfície gira."),
    estimatedActiveMinutes: 10,
    blocks: [
      { type: "PRACTICE" as const, exerciseKey: "exercise.swd.form.cross_contour", title: pt("Surface Wrap"), text: pt("Identifique o cross-contour que realmente envolve a superfície.") },
    ],
  },
  {
    key: "lesson.swd.c4.rotation",
    version: 1,
    unitKey: "unit.swd.c4.rotation",
    title: pt("Gire antes de desenhar"),
    objective: pt("Treinar rotação mental para prever uma forma vista de outro ângulo."),
    estimatedActiveMinutes: 11,
    blocks: [
      { type: "PRACTICE" as const, exerciseKey: "exercise.swd.form.mental_rotation", title: pt("Mental Rotation"), text: pt("Escolha a versão que representa corretamente a mesma forma após rotação.") },
    ],
  },
  {
    key: "lesson.swd.c4.form_combination",
    version: 1,
    unitKey: "unit.swd.c4.form_combination",
    title: pt("Combine volumes"),
    objective: pt("Construir objetos simples combinando caixas, cilindros e massas arredondadas."),
    estimatedActiveMinutes: 12,
    blocks: [
      { type: "DEMONSTRATION" as const, title: pt("Volume primeiro"), steps: [pt("Defina orientação"), pt("Escolha o volume principal"), pt("Adicione volumes secundários"), pt("Resolva interseções"), pt("Refine a silhueta")] },
    ],
  },
  {
    key: "lesson.swd.c4.self_check",
    version: 1,
    unitKey: "unit.swd.c4.self_check",
    title: pt("Teste o volume"),
    objective: pt("Revisar coerência espacial antes de adicionar detalhe."),
    estimatedActiveMinutes: 9,
    blocks: [
      { type: "DEMONSTRATION" as const, title: pt("HNK Form Check"), steps: [pt("Eixos coerentes"), pt("Planos legíveis"), pt("Elipses compatíveis"), pt("Cross-contours envolvem a superfície"), pt("Volumes podem ser imaginados por trás")] },
      { type: "CHECKPOINT" as const, text: pt("C4 termina quando você deixa de copiar apenas contornos e começa a construir algo que parece existir no espaço.") },
    ],
  },
] as const;
