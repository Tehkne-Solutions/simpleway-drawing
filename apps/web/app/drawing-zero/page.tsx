import Link from "next/link";

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
            <li>Não apague o que ficou imperfeito só para esconder o erro.</li>
            <li>Quando terminar, envie uma foto ou arquivo.</li>
          </ol>
        </section>

        <section className="upload-placeholder" aria-label="Envio do Drawing Zero em desenvolvimento">
          <p><strong>Upload seguro</strong></p>
          <p>O adapter de storage será conectado nesta mesma sprint. A obra será privada por padrão e registrada como <code>BASELINE</code>.</p>
        </section>

        <div className="flow-actions split-actions">
          <Link className="secondary link-button" href="/onboarding">Voltar</Link>
          <button className="primary" type="button" disabled>Enviar Drawing Zero</button>
        </div>
      </section>
    </main>
  );
}
