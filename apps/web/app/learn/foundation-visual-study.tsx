import { C1_VISUAL_STUDIES, type FoundationVisualStudyDefinition } from "./foundation-visual-study-c1";
import { C2_VISUAL_STUDIES } from "./foundation-visual-study-c2";
import { C3_VISUAL_STUDIES } from "./foundation-visual-study-c3";
import { C4_VISUAL_STUDIES } from "./foundation-visual-study-c4";

type VisualStudy = FoundationVisualStudyDefinition;

const FOUNDATION_VISUAL_STUDIES: Record<string, VisualStudy> = {
  "lesson.swd.c0.what_drawing_is": {
    src: "/studies/c0-observe-attempt-correct.svg",
    alt: "Quatro estágios de um estudo de caneca e pera: observar, tentar, comparar proporções e corrigir.",
    caption: "A correção começa comparando relações grandes, não escondendo o erro com detalhe.",
  },
  "lesson.swd.c0.intentional_marks": {
    src: "/studies/c0-intentional-line.svg",
    alt: "Quatro estágios de um traço intencional: origem e destino, planejamento, movimento fantasma e execução.",
    caption: "Planeje o movimento inteiro antes de encostar a ferramenta no papel ou canvas.",
  },
  "lesson.swd.c0.simple_construction": {
    src: "/studies/c0-mug-construction.svg",
    alt: "Construção progressiva de uma caneca a partir do volume principal, alça, comparação e contorno final.",
    caption: "A forma maior sustenta a secundária; o acabamento só entra quando essa relação funciona.",
  },
  "lesson.swd.c0.first_correction": {
    src: "/studies/c0-still-life-correction.svg",
    alt: "Natureza-morta de garrafa e maçã passando de erro proporcional para medição, correção e refinamento.",
    caption: "Corrija proporção, posição e ângulo antes de investir em acabamento.",
  },
  ...C1_VISUAL_STUDIES,
  ...C2_VISUAL_STUDIES,
  ...C3_VISUAL_STUDIES,
  ...C4_VISUAL_STUDIES,
};

export function FoundationVisualStudy({ lessonKey }: { lessonKey: string }) {
  const study = FOUNDATION_VISUAL_STUDIES[lessonKey];
  if (!study) return null;

  return (
    <figure className="mission-visual-study">
      <div className="mission-visual-study-frame">
        <img src={study.src} alt={study.alt} decoding="async" />
      </div>
      <figcaption><span>PRANCHA DE ESTUDO</span>{study.caption}</figcaption>
    </figure>
  );
}
