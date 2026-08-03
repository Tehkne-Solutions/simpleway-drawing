import Link from "next/link";
import { MotorDrillClient, type MotorExerciseKey } from "./motor-drill-client";

export const dynamic = "force-dynamic";

const drills: { key: MotorExerciseKey; label: string; short: string }[] = [
  { key: "exercise.swd.gym.intentional_line", label: "Linha", short: "Point to Point" },
  { key: "exercise.swd.gym.curve_path", label: "Curva", short: "Curve Path" },
  { key: "exercise.swd.gym.ellipse_control", label: "Elipse", short: "Ellipse Control" },
  { key: "exercise.swd.gym.parallel_rails", label: "Paralelas", short: "Parallel Rails" },
];

function isExercise(value: string | undefined): value is MotorExerciseKey {
  return drills.some((drill) => drill.key === value);
}

export default async function GymPage({ searchParams }: { searchParams: Promise<{ exercise?: string }> }) {
  const params = await searchParams;
  const selected: MotorExerciseKey = isExercise(params.exercise) ? params.exercise : "exercise.swd.gym.intentional_line";

  return (
    <main className="flow-shell">
      <section className="flow-card gym-card">
        <nav className="gym-drill-nav" aria-label="Drills C1">
          {drills.map((drill) => (
            <Link key={drill.key} href={`/gym?exercise=${encodeURIComponent(drill.key)}`} className={selected === drill.key ? "is-active" : ""}>
              <strong>{drill.label}</strong><span>{drill.short}</span>
            </Link>
          ))}
        </nav>
        <MotorDrillClient exerciseKey={selected} />
      </section>
    </main>
  );
}
