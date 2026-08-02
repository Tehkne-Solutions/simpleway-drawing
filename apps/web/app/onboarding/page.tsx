import Link from "next/link";

const goals = ["Mangá", "Comic", "Realista", "Ainda não sei"] as const;
const tools = ["Papel", "Tablet", "Ambos"] as const;

export default function OnboardingPage() {
  return (
    <main className="flow-shell">
      <section className="flow-card">
        <p className="eyebrow">Sua jornada começa aqui</p>
        <h1 className="flow-title">Antes de ensinar, queremos entender seu ponto de partida.</h1>
        <p className="lead compact">
          Você não precisa saber desenhar. Escolha o que mais te interessa e siga para o Drawing Zero.
        </p>

        <div className="choice-section">
          <h2>O que mais te interessa hoje?</h2>
          <div className="choice-grid">
            {goals.map((goal) => <button className="choice" type="button" key={goal}>{goal}</button>)}
          </div>
        </div>

        <div className="choice-section">
          <h2>Como você prefere desenhar?</h2>
          <div className="choice-grid compact-grid">
            {tools.map((tool) => <button className="choice" type="button" key={tool}>{tool}</button>)}
          </div>
        </div>

        <div className="flow-actions">
          <Link className="primary link-button" href="/drawing-zero">Fazer meu Drawing Zero</Link>
          <span>Sem nota. Sem julgamento. Apenas seu ponto de partida.</span>
        </div>
      </section>
    </main>
  );
}
