"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Path = "MANGA" | "COMIC" | "REALISTIC" | "EXPLORE";
type Experience = "NEW" | "BEGINNER" | "RETURNING" | "PRACTICING";
type Goal = "LEARN" | "CREATE" | "CAREER" | "IMPROVE";
type Tool = "PAPER" | "DIGITAL" | "BOTH";

const pathOptions: Array<[Path, string, string]> = [
  ["MANGA", "Mangá", "Personagens, narrativa visual e linguagem mangá."],
  ["COMIC", "Comic", "Desenho narrativo, personagens e linguagem de quadrinhos."],
  ["REALISTIC", "Realista", "Observação, forma, luz e representação realista."],
  ["EXPLORE", "Quero explorar", "Construa fundamentos antes de escolher uma direção."],
];

const experienceOptions: Array<[Experience, string]> = [
  ["NEW", "Nunca aprendi a desenhar"],
  ["BEGINNER", "Já tentei, mas sem método"],
  ["RETURNING", "Desenhava e quero retomar"],
  ["PRACTICING", "Já desenho e quero melhorar"],
];

const goalOptions: Array<[Goal, string]> = [
  ["LEARN", "Aprender os fundamentos"],
  ["CREATE", "Criar minhas próprias artes"],
  ["CAREER", "Me preparar para carreira artística"],
  ["IMPROVE", "Melhorar uma habilidade que já tenho"],
];

const toolOptions: Array<[Tool, string]> = [
  ["PAPER", "Papel"],
  ["DIGITAL", "Digital"],
  ["BOTH", "Ambos"],
];

export function OnboardingClient() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [preferredPath, setPreferredPath] = useState<Path | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<Experience | null>(null);
  const [primaryGoal, setPrimaryGoal] = useState<Goal | null>(null);
  const [preferredTool, setPreferredTool] = useState<Tool | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  const canContinue = useMemo(
    () => displayName.trim().length >= 2 && preferredPath && experienceLevel && primaryGoal && preferredTool,
    [displayName, preferredPath, experienceLevel, primaryGoal, preferredTool],
  );

  async function submit() {
    if (!canContinue || status === "saving") return;
    setStatus("saving");
    setMessage("");

    try {
      const session = await fetch("/api/session/guest", { method: "POST" });
      if (!session.ok && session.status !== 200) throw new Error("SESSION");

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, preferredPath, experienceLevel, primaryGoal, preferredTool }),
      });

      if (!response.ok) throw new Error("PROFILE");
      const payload = (await response.json()) as { next?: string };
      router.push(payload.next ?? "/drawing-zero");
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Não foi possível salvar seu ponto de partida. Tente novamente.");
    }
  }

  return (
    <section className="flow-card onboarding-card">
      <p className="eyebrow">Sua jornada começa aqui</p>
      <h1 className="flow-title">Vamos adaptar a experiência sem pular fundamentos.</h1>
      <p className="lead compact">
        Sua direção artística muda exemplos, contexto e recomendações futuras. A base C0–C4 continua a mesma para todos.
      </p>

      <div className="onboarding-field">
        <label htmlFor="display-name">Como quer ser chamado?</label>
        <input
          id="display-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={80}
          placeholder="Seu nome ou nome artístico"
          autoComplete="name"
        />
      </div>

      <ChoiceSection title="Qual direção artística mais te atrai hoje?">
        <div className="choice-grid">
          {pathOptions.map(([value, label, description]) => (
            <button
              key={value}
              className={`choice ${preferredPath === value ? "selected" : ""}`}
              type="button"
              aria-pressed={preferredPath === value}
              onClick={() => setPreferredPath(value)}
            >
              <strong>{label}</strong>
              <span>{description}</span>
            </button>
          ))}
        </div>
      </ChoiceSection>

      <ChoiceSection title="Qual descreve melhor seu momento?">
        <div className="choice-grid compact-grid two-by-two">
          {experienceOptions.map(([value, label]) => (
            <button key={value} className={`choice ${experienceLevel === value ? "selected" : ""}`} type="button" aria-pressed={experienceLevel === value} onClick={() => setExperienceLevel(value)}>
              {label}
            </button>
          ))}
        </div>
      </ChoiceSection>

      <ChoiceSection title="Qual transformação você mais busca?">
        <div className="choice-grid compact-grid two-by-two">
          {goalOptions.map(([value, label]) => (
            <button key={value} className={`choice ${primaryGoal === value ? "selected" : ""}`} type="button" aria-pressed={primaryGoal === value} onClick={() => setPrimaryGoal(value)}>
              {label}
            </button>
          ))}
        </div>
      </ChoiceSection>

      <ChoiceSection title="Como você pretende praticar na maior parte do tempo?">
        <div className="choice-grid compact-grid">
          {toolOptions.map(([value, label]) => (
            <button key={value} className={`choice ${preferredTool === value ? "selected" : ""}`} type="button" aria-pressed={preferredTool === value} onClick={() => setPreferredTool(value)}>
              {label}
            </button>
          ))}
        </div>
      </ChoiceSection>

      {message ? <p className="flow-error" role="alert">{message}</p> : null}

      <div className="flow-actions split-actions">
        <div>
          <strong>Próximo: Drawing Zero</strong>
          <span className="onboarding-note"> Sem nota e sem julgamento.</span>
        </div>
        <button className="primary" type="button" disabled={!canContinue || status === "saving"} onClick={submit}>
          {status === "saving" ? "Salvando..." : "Começar meu diagnóstico"}
        </button>
      </div>
    </section>
  );
}

function ChoiceSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="choice-section">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
