"use client";

import { REVIEW_PLAN_DECISION_MAX_LENGTH, type ArtworkReviewPlan } from "@swd/domain";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useState } from "react";
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

export function VersionComparison({ versions, artworkTitle, artworkId, focusCycleVersion }: { versions: VersionForComparison[]; artworkTitle: string; artworkId: string; focusCycleVersion?: number | null }) {
  const router = useRouter();
  const latest = versions[0] ?? null;
  const requestedTarget = focusCycleVersion ? versions.find((version) => version.versionNumber === focusCycleVersion) ?? null : null;
  const requestedCycle = requestedTarget ? resolveReviewCycle(requestedTarget) : null;
  const requestedBase = requestedCycle ? versions.find((version) => version.versionNumber === requestedCycle.baseVersionNumber) ?? null : null;
  const historicalContext = latest && requestedTarget && requestedCycle && requestedBase && requestedTarget.id !== latest.id
    ? { target: requestedTarget, cycle: requestedCycle, base: requestedBase }
    : null;
  const target = historicalContext?.target ?? latest;
  const referenceCandidates = target ? versions.filter((version) => version.versionNumber < target.versionNumber) : [];
  const defaultReference = historicalContext?.base ?? referenceCandidates[0] ?? target;
  const [selectedVersion, setSelectedVersion] = useState(defaultReference?.versionNumber ?? 1);
  const [reveal, setReveal] = useState(50);
  const [preserve, setPreserve] = useState("");
  const [transform, setTransform] = useState("");
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const selected = historicalContext?.base ?? referenceCandidates.find((version) => version.versionNumber === selectedVersion) ?? referenceCandidates[0] ?? target;

  if (!latest || !target || !selected || versions.length < 2) return null;

  const targetCycle = historicalContext?.cycle ?? resolveReviewCycle(target);
  const selectedCycle = resolveReviewCycle(selected);
  const targetPlan = targetCycle?.plan ?? null;
  const reviewBaseVersion = targetCycle?.baseVersionNumber ?? Math.max(1, target.versionNumber - 1);
  const targetProcessText = targetCycle?.provenance === "LEGACY"
    ? "Plano legado de revisão preservado abaixo para leitura junto da evidência visual."
    : target.notes || "Sem reflexão livre registrada nesta passagem.";
  const selectedProcessText = selectedCycle?.provenance === "LEGACY"
    ? "Plano legado preservado no Caderno de Revisões."
    : selected.notes || "Sem reflexão livre registrada nesta versão.";
  const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
  const preserveIntent = preserve.trim();
  const transformIntent = transform.trim();
  const intentReady = !historicalContext && Boolean(preserveIntent && transformIntent);
  const cycleTargets = versions.filter((version) => Boolean(resolveReviewCycle(version))).map((version) => version.versionNumber);
  const cycleIndex = historicalContext ? cycleTargets.indexOf(target.versionNumber) : -1;
  const newerCycleVersion = cycleIndex > 0 ? cycleTargets[cycleIndex - 1] ?? null : null;
  const olderCycleVersion = cycleIndex >= 0 ? cycleTargets[cycleIndex + 1] ?? null : null;
  const previousHistoricalCycle = cycleTargets.find((versionNumber) => versionNumber < latest.versionNumber) ?? null;
  const openCycle = (versionNumber: number) => {
    const destination = versionNumber === latest.versionNumber
      ? `/create/${encodeURIComponent(artworkId)}#version-comparison`
      : `/create/${encodeURIComponent(artworkId)}?cycle=${versionNumber}#version-comparison`;
    router.push(destination);
  };
  const returnToLatest = () => openCycle(latest.versionNumber);

  const continueWithIntent = () => {
    if (!intentReady || historicalContext) return;
    const intent: ArtworkReviewPlan = {
      preserve: preserveIntent.slice(0, REVIEW_PLAN_DECISION_MAX_LENGTH),
      transform: transformIntent.slice(0, REVIEW_PLAN_DECISION_MAX_LENGTH),
      baseVersionNumber: target.versionNumber,
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
    <section id="version-comparison" className={`version-comparison ${historicalContext ? "is-historical" : ""}`} aria-labelledby="version-comparison-title">
      <header className="version-comparison-head">
        <div>
          <p className="eyebrow">{historicalContext ? "Mesa Histórica" : "Mesa de Comparação"}</p>
          <h2 id="version-comparison-title">{historicalContext ? `Reveja o ciclo V${historicalContext.base.versionNumber} → V${target.versionNumber} como ele aconteceu.` : "Veja a mudança antes de decidir o próximo gesto."}</h2>
          <p>{historicalContext ? "A base e o resultado desta transição são preservados em modo somente leitura. O passado pode ser estudado, mas nunca usado para criar uma branch silenciosa da obra." : "Compare uma versão preservada com a versão atual. O sistema não inventa uma nota sobre sua arte: ele coloca as evidências lado a lado para você observar o que realmente mudou."}</p>
        </div>
        {historicalContext ? (
          <div className="version-historical-control">
            <span>CICLO PRESERVADO</span>
            <strong>{`V${historicalContext.base.versionNumber} → V${target.versionNumber}`}</strong>
            <small>Base autoritativa fixa · versão atual da obra: V{latest.versionNumber}</small>
            <div className="version-cycle-stepper" aria-label="Navegar pelos ciclos de revisão">
              <button type="button" disabled={!olderCycleVersion} onClick={() => olderCycleVersion && openCycle(olderCycleVersion)}>← Mais antigo</button>
              <button type="button" disabled={!newerCycleVersion} onClick={() => newerCycleVersion && openCycle(newerCycleVersion)}>Mais recente →</button>
            </div>
            <button type="button" onClick={returnToLatest}>Voltar à versão atual</button>
          </div>
        ) : (
          <div className="version-current-control">
            <label className="version-compare-select">Versão de referência
              <select value={selected.versionNumber} onChange={(event) => { setSelectedVersion(Number(event.target.value)); setReveal(50); }}>
                {referenceCandidates.map((version) => <option key={version.id} value={version.versionNumber}>V{version.versionNumber} · {sourceLabel[version.source] ?? version.source}</option>)}
              </select>
            </label>
            {previousHistoricalCycle ? <button className="version-open-history" type="button" onClick={() => openCycle(previousHistoricalCycle)}>← Rever ciclo anterior</button> : null}
          </div>
        )}
      </header>

      <div className="version-compare-grid">
        <article className="version-compare-card is-reference">
          <div className="version-compare-image"><img src={selected.readUrl} alt={`${artworkTitle} · versão ${selected.versionNumber}`} /></div>
          <div className="version-compare-meta"><span>REFERÊNCIA · V{selected.versionNumber}</span><strong>{sourceLabel[selected.source] ?? selected.source}</strong><small>{formatDate(selected.createdAt)}</small>{selectedCycle ? <small className="version-reference-cycle">CICLO V{selectedCycle.baseVersionNumber} → V{selected.versionNumber}</small> : null}<p>{selectedProcessText}</p></div>
        </article>
        <article className={`version-compare-card ${historicalContext ? "is-historical-target" : "is-current"}`}>
          <div className="version-compare-image"><img src={target.readUrl} alt={`${artworkTitle} · ${historicalContext ? "resultado histórico" : "versão atual"} ${target.versionNumber}`} /></div>
          <div className="version-compare-meta"><span>{historicalContext ? `RESULTADO · V${target.versionNumber}` : `ATUAL · V${target.versionNumber}`}</span><strong>{sourceLabel[target.source] ?? target.source}</strong><small>{formatDate(target.createdAt)}</small><p>{targetProcessText}</p></div>
        </article>
      </div>

      {targetPlan ? (
        <aside className="review-cycle-ledger" aria-label={`Plano que antecedeu a versão ${target.versionNumber}`}>
          <header>
            <span>{historicalContext ? `CICLO HISTÓRICO · V${reviewBaseVersion} → V${target.versionNumber}` : `CICLO DE REVISÃO · V${reviewBaseVersion} → V${target.versionNumber}`}</span>
            <strong>{historicalContext ? "Este plano pertence a esta transição preservada." : "O plano que antecedeu esta versão continua visível ao lado do resultado."}</strong>
            <p>{historicalContext ? "Releia o plano contra a evidência sem reescrever o passado. A Mesa Histórica não cria versões nem altera a intenção registrada." : "A Mesa não decide se a intenção foi cumprida. Compare o plano com a evidência atual e use sua própria leitura para definir a próxima passagem."}</p>
          </header>
          <div className="review-cycle-decisions">
            <article><span>PRESERVAR</span><p>{targetPlan.preserve}</p></article>
            <article><span>TRANSFORMAR</span><p>{targetPlan.transform}</p></article>
          </div>
          <footer><b>RESULTADO VISÍVEL</b><span>Use a comparação lado a lado e a régua abaixo. A evidência é a imagem; não existe nota automática de qualidade.</span></footer>
        </aside>
      ) : null}

      <div className="version-wipe-station">
        <div className="version-wipe-copy"><span>RÉGUA DE SOBREPOSIÇÃO</span><strong>Arraste para comparar a mesma área visual.</strong><small>{100 - reveal}% V{selected.versionNumber} · {reveal}% V{target.versionNumber}</small></div>
        <div className="version-wipe-canvas" style={{ "--compare-reveal": `${reveal}%` } as CSSProperties}>
          <img className="version-wipe-base" src={selected.readUrl} alt={`Base V${selected.versionNumber}`} />
          <div className="version-wipe-current"><img src={target.readUrl} alt={`Sobreposição V${target.versionNumber}`} /></div>
          <div className="version-wipe-divider" aria-hidden="true"><i /></div>
        </div>
        <label className="version-wipe-range">Comparação visual
          <input type="range" min={0} max={100} value={reveal} onChange={(event) => setReveal(Number(event.target.value))} aria-valuetext={`${reveal}% da versão ${target.versionNumber} visível`} />
        </label>
      </div>

      {historicalContext ? (
        <aside className="version-historical-readonly">
          <span>MODO SOMENTE LEITURA</span>
          <strong>O passado não vira uma nova branch da obra.</strong>
          <p>Você está revendo V{historicalContext.base.versionNumber} → V{target.versionNumber}. Para planejar e criar V{latest.versionNumber + 1}, volte à versão atual; a Câmara sempre parte do estado mais recente.</p>
          <div className="version-cycle-stepper compact">
            <button type="button" disabled={!olderCycleVersion} onClick={() => olderCycleVersion && openCycle(olderCycleVersion)}>← Mais antigo</button>
            <button type="button" disabled={!newerCycleVersion} onClick={() => newerCycleVersion && openCycle(newerCycleVersion)}>Mais recente →</button>
          </div>
          <button type="button" onClick={returnToLatest}>Voltar à versão atual</button>
        </aside>
      ) : (
        <aside className="version-compare-prompt">
          <span>CROMA · DECISÃO DE REVISÃO</span>
          <strong>Antes de criar V{target.versionNumber + 1}, transforme observação em intenção.</strong>
          <div className="version-intent-grid">
            <label><b>Preservar</b><span>Qual decisão da versão atual deve continuar viva?</span><textarea rows={3} maxLength={REVIEW_PLAN_DECISION_MAX_LENGTH} value={preserve} onChange={(event) => setPreserve(event.target.value)} placeholder="Ex.: preservar a silhueta simples e legível" /><small>{preserve.length}/{REVIEW_PLAN_DECISION_MAX_LENGTH}</small></label>
            <label><b>Transformar</b><span>Qual decisão precisa mudar na próxima passagem?</span><textarea rows={3} maxLength={REVIEW_PLAN_DECISION_MAX_LENGTH} value={transform} onChange={(event) => setTransform(event.target.value)} placeholder="Ex.: transformar o peso das linhas nas áreas de sombra" /><small>{transform.length}/{REVIEW_PLAN_DECISION_MAX_LENGTH}</small></label>
          </div>
          <button className="primary version-intent-action" type="button" disabled={!intentReady} onClick={continueWithIntent}>Levar decisão para a Câmara →</button>
          <p className="version-intent-note">A decisão fica somente nesta aba, escopada a esta obra e à versão atual. O texto não é colocado na URL e não cria Evidence até uma nova versão ser realmente registrada.</p>
          {handoffError ? <p className="flow-error" role="alert">{handoffError}</p> : null}
        </aside>
      )}
    </section>
  );
}
