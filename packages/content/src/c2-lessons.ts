const pt = (value: string) => ({ "pt-BR": value });

export const C2_LESSONS = [
  {
    key: "lesson.swd.c2.symbols_vs_observation",
    version: 1,
    unitKey: "unit.swd.c2.symbols_observation",
    title: pt("Símbolos vs observação"),
    objective: pt("Perceber quando o cérebro substitui o que vê por um símbolo conhecido."),
    estimatedActiveMinutes: 7,
    blocks: [
      { type: "HOOK" as const, text: pt("Saber que algo é uma cadeira não significa conhecer as relações visuais daquela cadeira.") },
      { type: "TEXT" as const, title: pt("Veja o que está ali"), text: pt("Antes de desenhar o nome do objeto, compare tamanho, direção, posição e formas específicas da referência.") },
      { type: "REFLECTION" as const, prompt: pt("Qual atitude reduz desenho por símbolo?"), options: [pt("Comparar relações visuais"), pt("Desenhar de memória imediatamente"), pt("Adicionar detalhes antes da estrutura")] },
    ],
  },
  {
    key: "lesson.swd.c2.size_proportion",
    version: 1,
    unitKey: "unit.swd.c2.size_proportion",
    title: pt("Tamanho e proporção"),
    objective: pt("Comparar largura, altura e relações relativas antes de desenhar."),
    estimatedActiveMinutes: 9,
    blocks: [
      { type: "TEXT" as const, title: pt("Uma parte vira unidade"), text: pt("Você não precisa saber centímetros. Escolha uma parte como unidade e compare quanto as demais ocupam em relação a ela.") },
      { type: "PRACTICE" as const, exerciseKey: "exercise.swd.observation.ratio_match", title: pt("Ratio Match"), text: pt("Escolha a relação visual que corresponde à referência e gere Evidence perceptiva isolada.") },
    ],
  },
  {
    key: "lesson.swd.c2.angle_direction",
    version: 1,
    unitKey: "unit.swd.c2.angles_direction",
    title: pt("Ângulos e direção"),
    objective: pt("Separar a capacidade de perceber um ângulo da capacidade de executá-lo."),
    estimatedActiveMinutes: 9,
    blocks: [
      { type: "HOOK" as const, text: pt("Às vezes a mão executa exatamente o ângulo errado que o olho escolheu.") },
      { type: "TEXT" as const, text: pt("Primeiro identifique a direção. Só depois transforme essa percepção em traço. Essa separação ajuda o Coach a localizar a origem do erro.") },
      { type: "PRACTICE" as const, exerciseKey: "exercise.swd.observation.angle_match", title: pt("Angle Match"), text: pt("Identifique o ângulo correto antes de desenhá-lo.") },
    ],
  },
  {
    key: "lesson.swd.c2.position_alignment",
    version: 1,
    unitKey: "unit.swd.c2.position_alignment",
    title: pt("Posição e alinhamento"),
    objective: pt("Usar relações verticais e horizontais para posicionar partes."),
    estimatedActiveMinutes: 8,
    blocks: [
      { type: "TEXT" as const, title: pt("Compare antes de mover"), text: pt("Pergunte o que está acima, abaixo, à esquerda ou alinhado com outro landmark antes de desenhar a parte isoladamente.") },
      { type: "PRACTICE" as const, exerciseKey: "exercise.swd.observation.alignment_hunt", title: pt("Alignment Hunt"), text: pt("Encontre o alinhamento que realmente existe na referência.") },
    ],
  },
  {
    key: "lesson.swd.c2.negative_space",
    version: 1,
    unitKey: "unit.swd.c2.negative_space",
    title: pt("Desenhe o espaço vazio"),
    objective: pt("Usar espaço negativo para escapar de símbolos e comparar relações."),
    estimatedActiveMinutes: 9,
    blocks: [
      { type: "HOOK" as const, text: pt("Às vezes é mais fácil desenhar o buraco entre duas partes do que as partes que você já acha que conhece.") },
      { type: "PRACTICE" as const, exerciseKey: "exercise.swd.observation.negative_space", title: pt("Negative Space"), text: pt("Identifique qual forma vazia corresponde ao espaço entre os objetos.") },
    ],
  },
  {
    key: "lesson.swd.c2.landmarks_envelope",
    version: 1,
    unitKey: "unit.swd.c2.landmarks_envelope",
    title: pt("Landmarks e envelope"),
    objective: pt("Marcar extremos e pontos estruturais antes do contorno."),
    estimatedActiveMinutes: 8,
    blocks: [
      { type: "DEMONSTRATION" as const, title: pt("Quatro extremos primeiro"), steps: [pt("Ponto mais alto"), pt("Ponto mais baixo"), pt("Extremo esquerdo"), pt("Extremo direito"), pt("Landmarks internos depois")] },
      { type: "CHECKPOINT" as const, text: pt("Landmarks reduzem position drift porque o desenho passa a ter âncoras antes do contorno.") },
    ],
  },
  {
    key: "lesson.swd.c2.measurement",
    version: 1,
    unitKey: "unit.swd.c2.measurement",
    title: pt("Estime, depois meça"),
    objective: pt("Usar medição como ferramenta de verificação e não como substituto da observação."),
    estimatedActiveMinutes: 8,
    blocks: [
      { type: "DEMONSTRATION" as const, title: pt("Estimate → Draw → Measure → Correct"), steps: [pt("Estime a relação"), pt("Faça sua tentativa"), pt("Revele ou faça a medição"), pt("Compare"), pt("Corrija a relação principal")] },
    ],
  },
  {
    key: "lesson.swd.c2.visual_simplification",
    version: 1,
    unitKey: "unit.swd.c2.simplification",
    title: pt("Simplificação visual"),
    objective: pt("Reduzir uma referência a poucas relações grandes antes do detalhe."),
    estimatedActiveMinutes: 8,
    blocks: [
      { type: "TEXT" as const, title: pt("Cinco formas são suficientes"), text: pt("Restrições de simplificação forçam você a escolher a informação estrutural em vez de copiar cada pequeno contorno.") },
      { type: "CHECKPOINT" as const, text: pt("C3 transformará essa percepção em uma linguagem de shapes. Aqui estamos treinando primeiro a escolha visual.") },
    ],
  },
  {
    key: "lesson.swd.c2.self_check",
    version: 1,
    unitKey: "unit.swd.c2.self_check",
    title: pt("Veja o erro antes do Coach"),
    objective: pt("Usar uma rotina curta de auto-checagem visual antes de receber feedback externo."),
    estimatedActiveMinutes: 8,
    blocks: [
      { type: "DEMONSTRATION" as const, title: pt("HNK Visual Check"), steps: [pt("Maior forma"), pt("Largura / altura"), pt("Ângulos principais"), pt("Extremos"), pt("Alinhamentos"), pt("Espaços negativos")] },
      { type: "REFLECTION" as const, prompt: pt("Por que tentar identificar o erro antes do Coach?"), options: [pt("Para treinar autonomia perceptiva"), pt("Para evitar qualquer feedback"), pt("Para decorar respostas corretas")] },
      { type: "CHECKPOINT" as const, text: pt("Você conclui C2 quando começa a decidir onde a marca deveria estar antes de pedir à mão que a execute.") },
    ],
  },
] as const;
