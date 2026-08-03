const pt = (value: string) => ({ "pt-BR": value });

export const C3_LESSONS = [
  {
    key: "lesson.swd.c3.primitives",
    version: 1,
    unitKey: "unit.swd.c3.primitives",
    title: pt("A linguagem das formas simples"),
    objective: pt("Reconhecer círculo, caixa, triângulo e cápsula como blocos estruturais."),
    estimatedActiveMinutes: 8,
    blocks: [
      { type: "HOOK" as const, text: pt("Objetos complexos ficam menos misteriosos quando você reduz a informação antes de desenhar.") },
      { type: "TEXT" as const, title: pt("Forma antes de detalhe"), text: pt("Procure primeiro massas simples. O objetivo não é encaixar tudo em geometria perfeita, mas criar uma estrutura controlável.") },
    ],
  },
  {
    key: "lesson.swd.c3.decomposition",
    version: 1,
    unitKey: "unit.swd.c3.decomposition",
    title: pt("Decomponha sem perder identidade"),
    objective: pt("Escolher poucas formas que preservem a estrutura principal do objeto."),
    estimatedActiveMinutes: 10,
    blocks: [
      { type: "PRACTICE" as const, exerciseKey: "exercise.swd.construction.decomposition", title: pt("Decomposition Match"), text: pt("Escolha o conjunto de primitivas que melhor preserva a estrutura da referência.") },
    ],
  },
  {
    key: "lesson.swd.c3.envelope",
    version: 1,
    unitKey: "unit.swd.c3.envelope",
    title: pt("Envelope antes do contorno"),
    objective: pt("Usar extremos e grandes direções para limitar a forma antes do detalhe."),
    estimatedActiveMinutes: 9,
    blocks: [
      { type: "TEXT" as const, text: pt("O envelope é uma fronteira simples que protege proporção e direção antes de você se comprometer com curvas e recortes menores.") },
      { type: "PRACTICE" as const, exerciseKey: "exercise.swd.construction.envelope", title: pt("Envelope Match"), text: pt("Identifique qual envelope captura melhor os extremos da referência.") },
    ],
  },
  {
    key: "lesson.swd.c3.silhouette",
    version: 1,
    unitKey: "unit.swd.c3.silhouette",
    title: pt("Silhueta que comunica"),
    objective: pt("Verificar se a massa externa ainda comunica o objeto sem detalhes internos."),
    estimatedActiveMinutes: 9,
    blocks: [
      { type: "PRACTICE" as const, exerciseKey: "exercise.swd.construction.silhouette", title: pt("Silhouette Read"), text: pt("Escolha a silhueta que preserva melhor a leitura estrutural.") },
    ],
  },
  {
    key: "lesson.swd.c3.relationships",
    version: 1,
    unitKey: "unit.swd.c3.relationships",
    title: pt("Relações entre formas"),
    objective: pt("Comparar tamanho, posição e direção entre formas simples."),
    estimatedActiveMinutes: 9,
    blocks: [
      { type: "DEMONSTRATION" as const, title: pt("Perguntas estruturais"), steps: [pt("Qual forma é maior?"), pt("Qual invade ou toca a outra?"), pt("Qual eixo domina?"), pt("Onde está o centro de massa?")] },
    ],
  },
  {
    key: "lesson.swd.c3.overlap",
    version: 1,
    unitKey: "unit.swd.c3.overlap",
    title: pt("Sobreposição cria organização"),
    objective: pt("Usar overlap para separar frente, trás e conexão entre massas."),
    estimatedActiveMinutes: 9,
    blocks: [
      { type: "PRACTICE" as const, exerciseKey: "exercise.swd.construction.overlap", title: pt("Overlap Logic"), text: pt("Escolha a relação de sobreposição que descreve corretamente a estrutura.") },
    ],
  },
  {
    key: "lesson.swd.c3.applied_construction",
    version: 1,
    unitKey: "unit.swd.c3.applied_construction",
    title: pt("Construção aplicada"),
    objective: pt("Organizar uma referência em envelope, massas e relações antes de refinar."),
    estimatedActiveMinutes: 12,
    blocks: [
      { type: "DEMONSTRATION" as const, title: pt("Sequência de construção"), steps: [pt("Envelope"), pt("Massa principal"), pt("Massa secundária"), pt("Overlaps"), pt("Silhueta"), pt("Detalhes somente no final")] },
      { type: "CHECKPOINT" as const, text: pt("C3 termina quando você consegue explicar a estrutura de um objeto antes de desenhar seu contorno final.") },
    ],
  },
] as const;
