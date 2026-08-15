import Link from "next/link";
import { CromaMark } from "./croma-mark";

type CromaCoachProps = {
  eyebrow?: string;
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  tone?: "gold" | "terracotta" | "ultramarine" | "veronese" | "violet";
};

export function CromaCoach({
  eyebrow = "Croma observa",
  title,
  message,
  actionLabel,
  actionHref,
  tone = "gold",
}: CromaCoachProps) {
  return (
    <aside className={`croma-coach croma-tone-${tone}`}>
      <div className="croma-coach-avatar" aria-hidden="true">
        <CromaMark />
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
