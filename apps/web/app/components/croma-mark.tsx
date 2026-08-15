export type CromaState = "observe" | "focus" | "curious" | "teach" | "challenge" | "correct" | "celebrate" | "guide";
export type CromaPigment = "gold" | "terracotta" | "ultramarine" | "veronese" | "violet";
export type CromaVariant = "core" | "sketch";

type CromaMarkProps = {
  className?: string;
  label?: string;
  state?: CromaState;
  pigment?: CromaPigment;
  variant?: CromaVariant;
};

const stateLabels: Record<CromaState, string> = {
  observe: "Croma observando com atenção",
  focus: "Croma concentrado no problema",
  curious: "Croma curioso diante de uma descoberta",
  teach: "Croma ensinando uma técnica",
  challenge: "Croma propondo um desafio",
  correct: "Croma ajudando a corrigir",
  celebrate: "Croma celebrando uma conquista",
  guide: "Croma indicando a próxima rota",
};

const mouthByState: Record<CromaState, string> = {
  observe: "M74 57c6 1 11 1 16-1",
  focus: "M75 58c5-1 9-1 14 0",
  curious: "M75 57c5 4 10 4 15 0",
  teach: "M73 56c6 5 12 5 18 0",
  challenge: "M74 58c6-2 11-2 16 0",
  correct: "M74 57c5 3 10 3 15 0",
  celebrate: "M72 55c7 8 14 8 21 0",
  guide: "M74 57c6 2 11 2 16 0",
};

const pupilByState: Record<CromaState, { cx: number; cy: number }> = {
  observe: { cx: 73, cy: 40 },
  focus: { cx: 68, cy: 43 },
  curious: { cx: 73, cy: 38 },
  teach: { cx: 70, cy: 41 },
  challenge: { cx: 72, cy: 42 },
  correct: { cx: 69, cy: 43 },
  celebrate: { cx: 70, cy: 42 },
  guide: { cx: 72, cy: 39 },
};

export function CromaMark({ className = "", label, state = "observe", pigment = "gold", variant = "core" }: CromaMarkProps) {
  const pupil = pupilByState[state];
  const accessibleLabel = label ?? stateLabels[state];

  return (
    <span className={`croma-mark croma-state-${state} croma-theme-${pigment} croma-variant-${variant} ${className}`.trim()} role="img" aria-label={accessibleLabel} data-croma-state={state} data-croma-pigment={pigment} data-croma-variant={variant}>
      <svg viewBox="0 0 120 120" focusable="false" aria-hidden="true">
        {variant === "sketch" ? <g className="croma-sketch-construction"><circle cx="63" cy="53" r="36" /><path d="M19 88 104 20M22 95h77M27 13v92" /><path d="M14 28h13M20 22v13M96 93h11" /></g> : null}
        <path className="croma-tail-line" d="M78 77c22 0 31 16 24 29-5 10-20 11-26 2-5-7 0-16 8-16 7 0 10 8 5 12" />
        <path className="croma-body-fill" d="M38 79c-9-10-13-24-8-36 6-16 20-24 37-22 13 2 24 10 28 21 3 9 1 19-5 27-7 10-18 15-30 16-9 1-16-1-22-6Z" />
        <path className="croma-face-fill" d="M38 62c-1-13 5-25 16-31 10-6 24-5 32 3l9 9-6 5 8 7-9 6c-8 6-18 9-30 8-8 0-15-2-20-7Z" />
        <path className="croma-crest" d="M48 32l4-12 8 9 7-14 7 14 9-8 1 15" />
        <circle className="croma-eye-ring" cx="67" cy="43" r="12" />
        <circle className="croma-eye" cx={pupil.cx} cy={pupil.cy} r="4.8" />
        <circle className="croma-eye-glint" cx={pupil.cx + 2} cy={pupil.cy - 2} r="1.4" />
        <path className="croma-mouth" d={mouthByState[state]} />
        <path className="croma-arm" d="M51 68c-8 6-12 13-11 22" />
        <path className="croma-brush" d="M28 101 70 65" />
        <path className="croma-brush-ferrule" d="m67 68 7-6 5 5-7 6Z" />
        <path className="croma-brush-tip" d="M78 66c5-7 8-13 8-18-6 2-12 6-15 12Z" />
        <circle className="croma-pigment croma-pigment-one" cx="45" cy="52" r="3" />
        <circle className="croma-pigment croma-pigment-two" cx="52" cy="77" r="2.5" />
        <circle className="croma-pigment croma-pigment-three" cx="31" cy="58" r="2.2" />

        {state === "observe" ? <g className="croma-expression croma-expression-observe"><path d="M91 27c8 4 12 10 13 18" /><path d="M96 21c10 5 16 13 18 23" /><circle cx="101" cy="49" r="2" /></g> : null}
        {state === "focus" ? <g className="croma-expression croma-expression-focus"><path className="croma-brow" d="M57 31c7 2 14 2 21-1" /><circle cx="101" cy="30" r="11" /><path d="M101 23v14M94 30h14" /></g> : null}
        {state === "curious" ? <g className="croma-expression croma-expression-curious"><path className="croma-brow" d="M58 30c6-4 13-4 19 0" /><path d="M99 22c1-7 13-7 14 1 1 7-8 7-8 13" /><circle cx="105" cy="43" r="2" /></g> : null}
        {state === "teach" ? <g className="croma-expression croma-expression-teach"><path d="M88 18h23v22H88z" /><path d="M93 24h12M93 29h8M93 34h10" /><path d="M79 48 91 38" /></g> : null}
        {state === "challenge" ? <g className="croma-expression croma-expression-challenge"><path className="croma-brow" d="M58 31c7-5 15-6 22-3" /><path d="M104 17v13" /><circle cx="104" cy="36" r="2.2" /></g> : null}
        {state === "correct" ? <g className="croma-expression croma-expression-correct"><path className="croma-brow" d="M58 31c6-2 12-2 18 1" /><path d="m92 28 6 6 12-15" /><path d="M91 43h18" /></g> : null}
        {state === "celebrate" ? <g className="croma-expression croma-expression-celebrate"><path d="M97 18v9M92 22h10M108 32l5 5M109 42h8" /><circle cx="91" cy="15" r="2" /><circle cx="114" cy="22" r="2" /><path d="m30 20 3 6 6 1-5 4 1 7-5-4-6 3 1-7-5-4 7-1Z" /></g> : null}
        {state === "guide" ? <g className="croma-expression croma-expression-guide"><circle cx="102" cy="30" r="13" /><path d="m102 19 4 11-4 11-4-11Z" /><path d="M102 43c-4 7-9 10-15 13" /><circle cx="84" cy="58" r="2" /></g> : null}
      </svg>
    </span>
  );
}
