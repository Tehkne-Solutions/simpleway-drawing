import Link from "next/link";
import { DrawingZeroClient } from "./drawing-zero-client";

export default function DrawingZeroPage() {
  return (
    <main className="flow-shell">
      <section className="flow-card drawing-zero">
        <div>
          <p className="eyebrow">C0 · Drawing Zero</p>
          <h1 className="flow-title">Desenhe do jeito que você consegue hoje.</h1>
          <p className="lead compact">
            Observe uma caneca, uma maçã e um livro. Não procure acertar tudo e não use guias. Vamos guardar este desenho como seu baseline privado.
          </p>
        </div>

        <div className="reference-board" aria-label="Brief do Drawing Zero">
          <div className="reference-object mug" aria-hidden="true" />
          <div className="reference-object apple" aria-hidden="true" />
          <div className="reference-object book" aria-hidden="true" />
        </div>

        <section className="instructions">
          <h2>Como fazer</h2>
          <ol>
            <li>Observe primeiro a composição inteira.</li>
            <li>Desenhe no papel, tablet ou ferramenta que preferir.</li>
            <li>Não esconda o que ficou imperfeito: este desenho é seu ponto de partida.</li>
            <li>Fotografe ou exporte o resultado e envie abaixo.</li>
          </ol>
        </section>

        <DrawingZeroClient />

        <div className="flow-actions">
          <Link className="secondary link-button" href="/onboarding">Voltar ao onboarding</Link>
        </div>
      </section>
    </main>
  );
}
