type CromaMarkProps = {
  className?: string;
  label?: string;
};

export function CromaMark({ className = "", label }: CromaMarkProps) {
  return (
    <span className={`croma-mark ${className}`.trim()} aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined}>
      <svg viewBox="0 0 120 120" focusable="false" aria-hidden="true">
        <path className="croma-tail-line" d="M78 77c22 0 31 16 24 29-5 10-20 11-26 2-5-7 0-16 8-16 7 0 10 8 5 12" />
        <path className="croma-body-fill" d="M38 79c-9-10-13-24-8-36 6-16 20-24 37-22 13 2 24 10 28 21 3 9 1 19-5 27-7 10-18 15-30 16-9 1-16-1-22-6Z" />
        <path className="croma-face-fill" d="M38 62c-1-13 5-25 16-31 10-6 24-5 32 3l9 9-6 5 8 7-9 6c-8 6-18 9-30 8-8 0-15-2-20-7Z" />
        <path className="croma-crest" d="M48 32l4-12 8 9 7-14 7 14 9-8 1 15" />
        <circle className="croma-eye-ring" cx="67" cy="43" r="12" />
        <circle className="croma-eye" cx="70" cy="41" r="4.8" />
        <circle className="croma-eye-glint" cx="72" cy="39" r="1.4" />
        <path className="croma-mouth" d="M74 57c6 2 11 2 16-1" />
        <path className="croma-arm" d="M51 68c-8 6-12 13-11 22" />
        <path className="croma-brush" d="M28 101 70 65" />
        <path className="croma-brush-ferrule" d="m67 68 7-6 5 5-7 6Z" />
        <path className="croma-brush-tip" d="M78 66c5-7 8-13 8-18-6 2-12 6-15 12Z" />
        <circle className="croma-pigment croma-pigment-one" cx="45" cy="52" r="3" />
        <circle className="croma-pigment croma-pigment-two" cx="52" cy="77" r="2.5" />
        <circle className="croma-pigment croma-pigment-three" cx="31" cy="58" r="2.2" />
      </svg>
    </span>
  );
}
