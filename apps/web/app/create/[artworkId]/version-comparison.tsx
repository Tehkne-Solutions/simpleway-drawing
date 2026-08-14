"use client";

import { REVIEW_PLAN_DECISION_MAX_LENGTH, type ArtworkReviewPlan } from "@swd/domain";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { resolveReviewCycle } from "../review-cycle";

type VersionForComparison = {
  id: string;
  versionNumber: number;
  readUrl: string;
  source: string;
  notes: string | null;
  reviewPlan: ArtworkReviewPlan | null;
  createdAt: string;
};

const sourceLabel: Record<string, string> = { CANVAS: "Câmara", UPLOAD: "Upload", PHOTO: "Foto" };
const REVIEW_INTENT_PREFIX = "swd.create.review-intent.v1";

export function VersionComparison({ versions, artworkTitle, artworkId }: { versions: VersionForComparison[]; artworkTitle: string; artworkId: string }) {
  const router = useRouter();
  const current = versions[0] ?? null;
  const historical = versions.slice(1);
  const [selectedVersion, setSelectedVersion] = useState(historical[0]?.versionNumber ?? current?.versionNumber ?? 1);
  const [reveal, setReveal] = useState(50);
  const [preserve, setPreserve] = useState("");
  const [transform, setTransform] = useState("");
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const selected = useMemo(() => historical.find((version) => version.versionNumber === selectedVersion) ?? historical[0] ?? current, [current, historical, selectedVersion]);

  if (!current || !selected || versions.length < 2) return null;

  const currentCycle = resolveReviewCycle(current);
  const selectedCycle = resolveReviewCycle(selected);
  const currentPlan = currentCycle?.plan ?? null;
  const reviewBaseVersion = currentCycle?.baseVersionNumber ?? Math.max(1, current.versionNumber - 1);
  const currentProcessText = currentCycle?.provenance === "LEGACY"
    ? "Plano legado de revisão preservado abaixo para leitura junto da evidência visual."
    : current.notes || "Sem reflexão livre registrada nesta passagem.";
  const selectedProcessText = selectedCycle?.provenance === "LEGACY"
    ? "Plano legado preservado no Caderno de Revisões."
    : selected.notes || "Sem reflexão livre registrada nesta versão.";
  const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
  const preserveIntent = preserve.trim();
  const transformIntent = transform.trim();
  const intentReady = Boolean(preserveIntent && transformIntent);

  const continueWithIntent = () => {
    if (!intentReady) return;
    const intent: ArtworkReviewPlan = {
      preserve: preserveIntent.slice(0, REVIEW_PLAN_DECISION_MAX_LENGTH),
      transform: transformIntent.slice(0, REVIEW_PLAN_DECISION_MAX_LENGTH),
      baseVersionNumber: current.versionNumber,
    };
    try {
      window.sessionStorage.setItem(`${REVIEW_INTENT_PREFIX}.${artworkId}`, JSON.stringify(intent));
      setHandoffError(null);
      router.push(`/create/work?artworkId=${encodeURIComponent(artworkId)}`);
    } catch {
      setHandoffError("Não foi possível preparar a passagem privada nesta aba. Tente novamente antes de sair da Mesa.");
    }
  };

  return (
    <section className="version-comparison" aria-labelledby="version-comparison-title">
      <header className="version-comparison-head">
        <div>
          <p className="eyebrow">Mesa de Comparação</p>
          <h2 id="version-comparison-title">Veja a mudança antes de decidir o próximo gesto.</h2>
          <p>Compare uma versão preservada com a versão atual. O sistema não inventa uma nota sobre sua arte: ele coloca as evidências lado a lado para você observar o que realmente mudou.</p>
        </div>
        <label className="version-compare-select">Versão de referência
          <select value={selected.versionNumber} onChange={(event) => { setSelectedVersion(Number(event.target.value)); setReveal(50); }}>
            {historical.map((version) => <option key={version.id} value={version.versionNumber}>V{version.versionNumber} · {sourceLabel[version.source] ?? version.source}</option>)}
          </select>
        </label>
      </header>

      <div className="version-compare-grid">
        <article className="version-compare-card is-reference">
          <div className="version-compare-image"><img src={selected.readUrl} alt={`${artworkTitle} · versão ${selected.versionNumber}`} /></div>
          <div className="version-compare-meta"><span>REFERÊNCIA · V{selected.versionNumber}</span><strong>{sourceLabel[selected.source] ?? selected.source}</strong><small>{formatDate(selected.createdAt)}</small>{selectedCycle ? <small className="version-reference-cycle">CICLO V{selectedCycle.baseVersionNumber} → V{selected.versionNumber}</small> : null}<p>{selectedProcessText}</p></div>
        </article>
        <article className="version-compare-card is-current">
          <div className="version-compare-image"><img src={current.readUrl} alt={`${artworkTitle} · versão atual ${current.versionNumber}`} /></div>
          <div className="version-compare-meta"><span>ATUAL · V{current.versionNumber}</span><strong>{sourceLabel[current.source] ?? current.source}</strong><small>{formatDate(current.createdAt)}</small><p>{currentProcessText}</p></div>
        </article>
      </div>

      {currentPlan ? (
        <aside className="review-cycle-ledger" aria-label={`Plano que antecedeu a versão ${current.versionNumber}`}>
          <header>
            <span>CICLO DE REVISÃO · V{reviewBaseVersion} → V{current.versionNumber}</span>
            <strong>O plano que antecedeu esta versão continua visível ao lado do resultado.</strong>
            <p>A Mesa não decide se a intenção foi cumprida. Compare o plano com a evidência atual e use sua própria leitura para definir a próxima passagem.</p>
          </header>
          <div className="review-cycle-decisions">
            <article><span>PRESERVAR</span><p>{currentPlan.preserve}</p></article>
            <article><span>TRANSFORMAR</span><p>{currentPlan.transform}</p></article>
          </div>
          <footer><b>RESULTADO VISÍVEL</b><span>Use a comparação lado a lado e a régua abaixo. A evidência é a imagem; não existe nota automática de qualidade.</span></footer>
        </aside>
      ) : null}

      <div className="version-wipe-station">
        <div className="version-wipe-copy"><span>RÉGUA DE SOBREPOSIÇÃO</span><strong>Arraste para comparar a mesma área visual.</strong><small>{100 - reveal}% V{selected.versionNumber} · {reveal}% V{current.versionNumber}</small></div>
        <div className="version-wipe-canvas" style={{ "--compare-reveal": `${reveal}%` } as CSSProperties}>
          <img className="version-wipe-base" src={selected.readUrl} alt={`Base V${selected.versionNumber}`} />
          <div className="version-wipe-current"><img src={current.readUrl} alt={`Sobreposição V${current.versionNumber}`} /></div>
          <div className="version-wipe-divider" aria-hidden="true"><i /></div>
        </div>
        <label className="version-wipe-range">Comparação visual
          <input type="range" min={0} max={100} value={reveal} onChange={(event) => setReveal(Number(event.target.value))} aria-valuetext={`${reveal}% da versão atual visível`} />
        </label>
      </div>

      <aside className="version-compare-prompt">
        <span>CROMA · DECISÃO DE REVISÃO</span>
        <strong>Antes de criar V{current.versionNumber + 1}, transforme observação em intenção.</strong>
        <div className="version-intent-grid">
          <label><b>Preservar</b><span>Qual decisão da versão atual deve continuar viva?</span><textarea rows={3} maxLength={REVIEW_PLAN_DECISION_MAX_LENGTH} value={preserve} onChange={(event) => setPreserve(event.target.value)} placeholder="Ex.: preservar a silhueta simples e legível" /><small>{preserve.length}/{REVIEW_PLAN_DECISION_MAX_LENGTH}</small></label>
          <label><b>Transformar</b><span>Qual decisão precisa mudar na próxima passagem?</span><textarea rows={3} maxLength={REVIEW_PLAN_DECISION_MAX_LENGTH} value={transform} onChange={(event) => setTransform(event.target.value)} placeholder="Ex.: transformar o peso das linhas nas áreas de sombra" /><small>{transform.length}/{REVIEW_PLAN_DECISION_MAX_LENGTH}</small></label>
        </div>
        <button className="primary version-intent-action" type="button" disabled={!intentReady} onClick={continueWithIntent}>Levar decisão para a Câmara →</button>
        <p className="version-intent-note">A decisão fica somente nesta aba, escopada a esta obra e à versão atual. O texto não é colocado na URL e não cria Evidence até uma nova versão ser realmente registrada.</p>
        {handoffError ? <p className="flow-error" role="alert">{handoffError}</p> : null}
      </aside>
    </section>
  );
}
