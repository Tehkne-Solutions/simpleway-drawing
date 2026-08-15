import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getArtworkRepository } from "../../../server/runtime";
import { getSessionUserId } from "../../../server/session";
import "../historical-comparison-v128.css";
import "../review-cycle-v125.css";
import "../review-intent-v123.css";
import "../review-notebook-v127.css";
import "../review-timeline-v129.css";
import { resolveReviewCycle } from "../review-cycle";
import { VersionComparison } from "./version-comparison";
import { VersionForm } from "./version-form";

const typeLabel: Record<string, string> = {
  BASELINE: "Baseline",
  STUDY: "Estudo",
  SKETCH: "Sketch",
  PROJECT: "Projeto",
  ARTWORK: "Artwork",
};

type ArtworkDetailSearchParams = { cycle?: string | string[] };

export default async function ArtworkDetailPage({ params, searchParams }: { params: Promise<{ artworkId: string }>; searchParams: Promise<ArtworkDetailSearchParams> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/create");
  const [{ artworkId }, query] = await Promise.all([params, searchParams]);
  const record = await getArtworkRepository().getOwned(userId, artworkId);
  if (!record) notFound();

  const versions = record.versions.map((version) => ({
    ...version,
    readUrl: `/api/artworks/${encodeURIComponent(record.artwork.id)}/versions/${version.versionNumber}/image`,
  }));
  const chamberEligible = record.artwork.type === "ARTWORK";
  const artworkTitle = record.artwork.title ?? "Sem título";
  const comparisonVersions = versions.map((version) => ({
    id: version.id,
    versionNumber: version.versionNumber,
    readUrl: version.readUrl,
    source: version.source,
    notes: version.notes,
    reviewPlan: version.reviewPlan,
    createdAt: version.createdAt.toISOString(),
  }));
  const historyVersions = versions.map((version) => ({ ...version, reviewCycle: resolveReviewCycle(version) }));
  const reviewCycleCount = historyVersions.filter((version) => Boolean(version.reviewCycle)).length;
  const latestVersionNumber = historyVersions[0]?.versionNumber ?? 0;
  const cycleParam = Array.isArray(query.cycle) ? query.cycle[0] : query.cycle;
  const requestedCycleVersion = cycleParam ? Number(cycleParam) : NaN;
  const focusCycleVersion = Number.isInteger(requestedCycleVersion)
    && requestedCycleVersion >= 2
    && requestedCycleVersion < latestVersionNumber
    && historyVersions.some((version) => version.versionNumber === requestedCycleVersion && Boolean(version.reviewCycle))
      ? requestedCycleVersion
      : null;
  const reviewTimeline = historyVersions.filter((version) => Boolean(version.reviewCycle)).slice().reverse();
  const activeCycleVersion = focusCycleVersion ?? (historyVersions[0]?.reviewCycle ? latestVersionNumber : null);

  return (
    <main className="flow-shell">
      <section className="flow-card artwork-detail-card">
        <header className="artwork-detail-header">
          <div>
            <p className="eyebrow">Create · {typeLabel[record.artwork.type] ?? record.artwork.type}</p>
            <h1 className="flow-title">{artworkTitle}</h1>
            <p className="lead compact">{record.artwork.visibility === "PRIVATE" ? "Privado" : record.artwork.visibility} · {versions.length} versão(ões) preservada(s)</p>
          </div>
          <Link className="secondary link-button" href="/create">Voltar à biblioteca</Link>
        </header>

        {chamberEligible ? (
          <aside className="lesson-checkpoint">
            <div>
              <strong>Esta obra pode continuar dentro da Câmara.</strong>
              <span>A versão atual vira uma base raster imutável. Novas decisões são desenhadas por cima e entram como uma nova versão, sem apagar o histórico.</span>
            </div>
            <Link className="primary link-button" href={`/create/work?artworkId=${record.artwork.id}`}>Continuar na Câmara</Link>
          </aside>
        ) : null}

        {comparisonVersions.length >= 2 ? <VersionComparison key={focusCycleVersion ? `historical-${focusCycleVersion}` : "latest"} versions={comparisonVersions} artworkTitle={artworkTitle} artworkId={record.artwork.id} focusCycleVersion={focusCycleVersion} /> : (
          <aside className="version-compare-empty"><span>MESA DE COMPARAÇÃO</span><strong>A segunda versão abrirá a comparação visual.</strong><p>Preserve a primeira versão e registre uma nova passagem para enxergar mudanças reais lado a lado.</p></aside>
        )}

        {reviewTimeline.length > 0 ? (
          <nav className="review-timeline" aria-label="Linha de revisão da obra">
            <header><div><p className="eyebrow">Linha de Revisão</p><strong>Navegue pelo tempo da obra sem procurar cartões no arquivo.</strong></div><span>{reviewTimeline.length} ciclo(s)</span></header>
            <div className="review-timeline-track">
              {reviewTimeline.map((version, index) => {
                const cycle = version.reviewCycle!;
                const isCurrent = version.versionNumber === latestVersionNumber;
                const isActive = activeCycleVersion === version.versionNumber;
                const href = isCurrent
                  ? `/create/${record.artwork.id}#version-comparison`
                  : `/create/${record.artwork.id}?cycle=${version.versionNumber}#version-comparison`;
                return (
                  <Link key={version.id} href={href} className={`review-timeline-node ${isCurrent ? "is-current" : ""} ${isActive ? "is-active" : ""}`} aria-current={isActive ? "step" : undefined}>
                    <span>{isCurrent ? "ATUAL" : `PASSAGEM ${index + 1}`}</span>
                    <strong>V{cycle.baseVersionNumber} → V{version.versionNumber}</strong>
                    <small>{cycle.provenance === "STRUCTURED" ? "ESTRUTURADO" : "LEGADO"}</small>
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : null}

        <section className="version-history version-review-notebook" aria-labelledby="version-history-title">
          <div className="version-history-heading"><p className="eyebrow">Arquivo de versões · Caderno de Revisões</p><h2 id="version-history-title">Cada passagem preserva resultado, intenção e reflexão.</h2><span>{reviewCycleCount} ciclo(s) de revisão reconhecido(s)</span></div>
          {historyVersions.map((version, index) => {
            const cycle = version.reviewCycle;
            const reflection = cycle?.provenance === "LEGACY" ? null : version.notes;
            return (
              <article key={version.id} className={`version-card ${index === 0 ? "is-current" : ""} ${cycle ? "has-review-cycle" : ""}`}>
                <div className="version-image-wrap"><img src={version.readUrl} alt={`Versão ${version.versionNumber} de ${artworkTitle}`} loading={index === 0 ? "eager" : "lazy"} decoding="async" /></div>
                <div className="version-meta">
                  <div><span>v{version.versionNumber}</span>{index === 0 ? <strong>Atual</strong> : null}</div>
                  <p>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(version.createdAt)}</p>
                  {cycle ? (
                    <aside className="version-cycle-record" aria-label={`Ciclo V${cycle.baseVersionNumber} para V${version.versionNumber}`}>
                      <header><span>CICLO V{cycle.baseVersionNumber} → V{version.versionNumber}</span><small>{cycle.provenance === "STRUCTURED" ? "ESTRUTURADO" : "LEGADO"}</small></header>
                      <div className="version-cycle-pair"><div><b>PRESERVAR</b><p>{cycle.plan.preserve}</p></div><div><b>TRANSFORMAR</b><p>{cycle.plan.transform}</p></div></div>
                      <p className={`version-cycle-reflection ${cycle.provenance === "LEGACY" ? "version-cycle-legacy" : ""}`}><b>REFLEXÃO DA PASSAGEM</b>{cycle.provenance === "LEGACY" ? "Esta versão antiga guardava plano e nota no mesmo texto; não existe reflexão livre separada para recuperar." : reflection || "Sem reflexão livre registrada nesta passagem."}</p>
                      {index === 0 ? <a className="version-cycle-replay" href="#version-comparison">Rever ciclo atual na Mesa ↑</a> : <Link className="version-cycle-replay" href={`/create/${record.artwork.id}?cycle=${version.versionNumber}#version-comparison`}>Rever este ciclo na Mesa →</Link>}
                    </aside>
                  ) : version.notes ? <blockquote>{version.notes}</blockquote> : <p>Sem reflexão livre registrada.</p>}
                </div>
              </article>
            );
          })}
        </section>

        {record.artwork.type === "BASELINE" ? (
          <div className="baseline-lock"><strong>Drawing Zero é um baseline imutável.</strong><span>Ele permanece preservado para comparações futuras.</span></div>
        ) : <VersionForm artworkId={record.artwork.id} />}

        <div className="flow-actions split-actions">
          <Link className="secondary link-button" href="/journey">Ver no Journey</Link>
          {chamberEligible ? <Link className="primary link-button" href={`/create/work?artworkId=${record.artwork.id}`}>Criar próxima versão na Câmara</Link> : <Link className="primary link-button" href="/gym">Treinar antes da próxima versão</Link>}
        </div>
      </section>
    </main>
  );
}
