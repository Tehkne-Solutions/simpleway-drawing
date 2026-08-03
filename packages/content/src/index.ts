import { z } from "zod";
import { C1_LESSONS as C1_RAW_LESSONS } from "./c1-lessons.js";

export const localizedTextSchema = z.record(z.string(), z.string().min(1));

export const skillSchema = z.object({
  key: z.string().regex(/^skill\./),
  version: z.number().int().positive(),
  domain: z.enum(["meta", "motor", "perception", "shape", "form", "spatial"]),
  type: z.enum(["META", "MOTOR", "PERCEPTUAL", "STRUCTURAL", "SPATIAL", "CREATIVE"]),
  retentionMode: z.enum(["STANDARD", "MAINTENANCE", "TRANSFER", "PROJECT_BASED"]),
  foundational: z.boolean(),
  transferable: z.boolean(),
  title: localizedTextSchema,
});

export const cycleSchema = z.object({
  key: z.string().regex(/^cycle\./),
  version: z.number().int().positive(),
  stageKey: z.string().regex(/^stage\./),
  title: localizedTextSchema,
  transformation: localizedTextSchema,
  unitKeys: z.array(z.string().regex(/^unit\./)).min(1),
});

export const lessonBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("HOOK"), text: localizedTextSchema }),
  z.object({ type: z.literal("TEXT"), title: localizedTextSchema.optional(), text: localizedTextSchema }),
  z.object({ type: z.literal("DEMONSTRATION"), title: localizedTextSchema, steps: z.array(localizedTextSchema).min(1) }),
  z.object({ type: z.literal("REFLECTION"), prompt: localizedTextSchema, options: z.array(localizedTextSchema).min(2) }),
  z.object({ type: z.literal("DRAWING_ZERO"), exerciseKey: z.literal("exercise.swd.c0.drawing_zero") }),
  z.object({ type: z.literal("PRACTICE"), exerciseKey: z.string().regex(/^exercise\./), title: localizedTextSchema, text: localizedTextSchema }),
  z.object({ type: z.literal("CHECKPOINT"), text: localizedTextSchema }),
]);

export const lessonSchema = z.object({
  key: z.string().regex(/^lesson\./),
  version: z.number().int().positive(),
  unitKey: z.string().regex(/^unit\./),
  title: localizedTextSchema,
  objective: localizedTextSchema,
  estimatedActiveMinutes: z.number().int().positive(),
  blocks: z.array(lessonBlockSchema).min(1),
});

export type SkillDefinition = z.infer<typeof skillSchema>;
export type CycleDefinition = z.infer<typeof cycleSchema>;
export type LessonDefinition = z.infer<typeof lessonSchema>;
export type LessonBlock = z.infer<typeof lessonBlockSchema>;

const pt = (value: string) => ({ "pt-BR": value });

export const C0_LESSONS: LessonDefinition[] = [
  {
    key: "lesson.swd.c0.what_drawing_is",
    version: 1,
    unitKey: "unit.swd.c0.orientation",
    title: pt("O que desenho realmente é"),
    objective: pt("Entender desenho como uma habilidade treinável de observação, decisão e execução."),
    estimatedActiveMinutes: 4,
    blocks: [
      { type: "HOOK", text: pt("Você não precisa nascer sabendo desenhar. Precisa aprender a observar, tentar e corrigir.") },
      { type: "TEXT", title: pt("Desenho não é adivinhação"), text: pt("Desenhar é transformar percepção e intenção em marcas visuais. Isso envolve habilidades diferentes — e cada uma delas pode ser treinada.") },
      { type: "DEMONSTRATION", title: pt("O ciclo mais importante"), steps: [pt("Veja"), pt("Tente"), pt("Compare"), pt("Corrija"), pt("Tente novamente")] },
      { type: "REFLECTION", prompt: pt("Quando um desenho não funciona, qual deve ser sua primeira reação?"), options: [pt("Observar o que aconteceu"), pt("Concluir que não tenho talento"), pt("Esconder o erro com detalhes")] },
    ],
  },
  {
    key: "lesson.swd.c0.hnk_loop",
    version: 1,
    unitKey: "unit.swd.c0.orientation",
    title: pt("Seu primeiro loop HNK"),
    objective: pt("Praticar a ideia de que feedback existe para gerar uma nova tentativa."),
    estimatedActiveMinutes: 4,
    blocks: [
      { type: "HOOK", text: pt("O objetivo não é acertar de primeira. É aprender a produzir uma segunda tentativa melhor.") },
      { type: "TEXT", text: pt("No SimpleWay Drawing, erro não encerra o exercício. Ele informa qual é a próxima ação.") },
      { type: "CHECKPOINT", text: pt("Feedback → treino → nova tentativa. Esse comportamento vale mais do que simplesmente concluir uma aula.") },
    ],
  },
  {
    key: "lesson.swd.c0.drawing_zero",
    version: 1,
    unitKey: "unit.swd.c0.drawing_zero",
    title: pt("Drawing Zero"),
    objective: pt("Registrar seu ponto de partida sem pontuação ou julgamento."),
    estimatedActiveMinutes: 12,
    blocks: [
      { type: "HOOK", text: pt("Agora vamos guardar como você desenha hoje — antes de ensinar qualquer correção.") },
      { type: "DRAWING_ZERO", exerciseKey: "exercise.swd.c0.drawing_zero" },
      { type: "REFLECTION", prompt: pt("O que pareceu mais difícil?"), options: [pt("Saber por onde começar"), pt("Comparar tamanhos"), pt("Controlar a mão"), pt("Perceber o que estava errado")] },
    ],
  },
  {
    key: "lesson.swd.c0.intentional_marks",
    version: 1,
    unitKey: "unit.swd.c0.intentional_marks",
    title: pt("Marcas com intenção"),
    objective: pt("Perceber a diferença entre um traço planejado e um traço apenas corrigido repetidamente."),
    estimatedActiveMinutes: 6,
    blocks: [
      { type: "TEXT", title: pt("Antes da linha, existe uma decisão"), text: pt("Escolha onde o traço começa, onde termina e só então execute. Não tente consertar cada milímetro enquanto desenha.") },
      { type: "DEMONSTRATION", title: pt("Look · Plan · Ghost · Commit"), steps: [pt("Olhe origem e destino"), pt("Planeje a direção"), pt("Simule o movimento sem tocar"), pt("Execute com decisão")] },
      { type: "CHECKPOINT", text: pt("Confiança de linha não significa pressa. Significa intenção clara.") },
    ],
  },
  {
    key: "lesson.swd.c0.seeing_before_naming",
    version: 1,
    unitKey: "unit.swd.c0.seeing_before_naming",
    title: pt("Veja antes de nomear"),
    objective: pt("Começar a observar formas e relações em vez de símbolos mentais."),
    estimatedActiveMinutes: 6,
    blocks: [
      { type: "HOOK", text: pt("Seu cérebro sabe o que é uma caneca. Isso não significa que ele conhece a forma exata da caneca que está diante de você.") },
      { type: "TEXT", text: pt("Antes de pensar no nome do objeto, procure largura, altura, inclinação e as grandes formas que o compõem.") },
      { type: "REFLECTION", prompt: pt("Ao observar um objeto, o que devemos priorizar primeiro?"), options: [pt("Grandes relações e formas"), pt("Pequenos detalhes"), pt("O símbolo que lembro de memória")] },
    ],
  },
  {
    key: "lesson.swd.c0.simple_construction",
    version: 1,
    unitKey: "unit.swd.c0.simple_construction",
    title: pt("Construa do grande para o pequeno"),
    objective: pt("Aprender a decompor um objeto simples em poucas formas antes de adicionar detalhes."),
    estimatedActiveMinutes: 7,
    blocks: [
      { type: "HOOK", text: pt("Objetos complexos ficam mais fáceis quando você para de tentar desenhá-los de uma vez.") },
      { type: "TEXT", title: pt("Encontre a estrutura"), text: pt("Comece pela maior forma, adicione a forma secundária e compare a relação entre elas. Detalhes entram somente depois que a estrutura funciona.") },
      { type: "DEMONSTRATION", title: pt("Big before small"), steps: [pt("Encontre a forma maior"), pt("Marque a forma secundária"), pt("Compare tamanho e posição"), pt("Só então acrescente detalhes mínimos")] },
      { type: "CHECKPOINT", text: pt("Construção simples não é reduzir qualidade. É organizar o problema antes de refiná-lo.") },
    ],
  },
  {
    key: "lesson.swd.c0.first_correction",
    version: 1,
    unitKey: "unit.swd.c0.first_correction_loop",
    title: pt("A primeira correção"),
    objective: pt("Aprender a corrigir uma relação importante antes de adicionar detalhes."),
    estimatedActiveMinutes: 7,
    blocks: [
      { type: "TEXT", title: pt("Corrija upstream"), text: pt("Se a forma maior está errada, detalhe não resolve o problema. Corrija primeiro tamanho, posição ou direção.") },
      { type: "DEMONSTRATION", title: pt("Ordem de revisão"), steps: [pt("Forma maior"), pt("Proporção"), pt("Posição"), pt("Ângulo"), pt("Só então detalhes")] },
      { type: "CHECKPOINT", text: pt("Você conclui C0 quando entende que observar, tentar, comparar e corrigir é o próprio processo de aprender a desenhar.") },
    ],
  },
];

export const C1_LESSONS: LessonDefinition[] = lessonSchema.array().parse(C1_RAW_LESSONS);
export const FOUNDATION_LESSONS: LessonDefinition[] = [...C0_LESSONS, ...C1_LESSONS];

export function getC0Lesson(key: string): LessonDefinition | null {
  return C0_LESSONS.find((lesson) => lesson.key === key) ?? null;
}

export function getC1Lesson(key: string): LessonDefinition | null {
  return C1_LESSONS.find((lesson) => lesson.key === key) ?? null;
}

export function getFoundationLesson(key: string): LessonDefinition | null {
  return FOUNDATION_LESSONS.find((lesson) => lesson.key === key) ?? null;
}
