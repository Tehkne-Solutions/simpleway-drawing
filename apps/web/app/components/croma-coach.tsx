import Link from "next/link";
import { CromaMark, type CromaState } from "./croma-mark";

type CromaCoachProps = {
  eyebrow?: string;
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  tone?: "gold" | "terracotta" | "ultramarine" | "veronese" | "violet";
  state?: CromaState;
};

export function CromaCoach({
  eyebrow = "Croma observa",
  title,
  message,
  actionLabel,
  actionHref,
  tone = "gold",
  state = "teach",
}: CromaCoachProps) {
  return (
    <aside className={`croma-coach croma-tone-${tone} croma-coach-state-${state}`} data-croma-state={state}>
      <div className="croma-coach-avatar">
        <CromaMark state={state} label={`${eyebrow}: ${title}`} />
      </div>
      <div className="croma-coach-copy">
        <p className="croma-coach-eyebrow">{eyebrow}</p>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {actionLabel && actionHref ? <Link className="croma-coach-action" href={actionHref}>{actionLabel} <span aria-hidden="true">→</span></Link> : null}
    </aside>
  );
}
