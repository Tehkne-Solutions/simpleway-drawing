import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getArtworkRepository, getStorage } from "../../../server/runtime";
import { getSessionUserId } from "../../../server/session";
import "../review-cycle-v125.css";
import "../review-intent-v123.css";
import "../review-notebook-v127.css";
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

export default async function ArtworkDetailPage({ params }: { params: Promise<{ artworkId: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/create");
  const { artworkId } = await params;
  const record = await getArtworkRepository().getOwned(userId, artworkId);
  if (!record) notFound();

  const versions = await Promise.all(record.versions.map(async (version) => ({
    ...version,
    readUrl: await getStorage().createPrivateReadUrl(version.storageKey, 600),
  })));
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

        {comparisonVersions.length >= 2 ? <VersionComparison versions={comparisonVersions} artworkTitle={artworkTitle} artworkId={record.artwork.id} /> : (
          <aside className="version-compare-empty"><span>MESA DE COMPARAÇÃO</span><strong>A segunda versão abrirá a comparação visual.</strong><p>Preserve a primeira versão e registre uma nova passagem para enxergar mudanças reais lado a lado.</p></aside>
        )}

        <section className="version-history version-review-notebook" aria-labelledby="version-history-title">
          <div className="version-history-heading"><p className="eyebrow">Arquivo de versões · Caderno de Revisões</p><h2 id="version-history-title">Cada passagem preserva resultado, intenção e reflexão.</h2><span>{reviewCycleCount} ciclo(s) de revisão reconhecido(s)</span></div>
          {historyVersions.map((version, index) => {
            const cycle = version.reviewCycle;
            const reflection = cycle?.provenance === "LEGACY" ? null : version.notes;
            return (
              <article key={version.id} className={`version-card ${index === 0 ? "is-current" : ""} ${cycle ? "has-review-cycle" : ""}`}>
                <div className="version-image-wrap"><img src={version.readUrl} alt={`Versão ${version.versionNumber} de ${artworkTitle}`} /></div>
                <div className="version-meta">
                  <div><span>v{version.versionNumber}</span>{index === 0 ? <strong>Atual</strong> : null}</div>
                  <p>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(version.createdAt)}</p>
                  {cycle ? (
                    <aside className="version-cycle-record" aria-label={`Ciclo V${cycle.baseVersionNumber} para V${version.versionNumber}`}>
                      <header><span>CICLO V{cycle.baseVersionNumber} → V{version.versionNumber}</span><small>{cycle.provenance === "STRUCTURED" ? "ESTRUTURADO" : "LEGADO"}</small></header>
                      <div className="version-cycle-pair"><div><b>PRESERVAR</b><p>{cycle.plan.preserve}</p></div><div><b>TRANSFORMAR</b><p>{cycle.plan.transform}</p></div></div>
                      <p className={`version-cycle-reflection ${cycle.provenance === "LEGACY" ? "version-cycle-legacy" : ""}`}><b>REFLEXÃO DA PASSAGEM</b>{cycle.provenance === "LEGACY" ? "Esta versão antiga guardava plano e nota no mesmo texto; não existe reflexão livre separada para recuperar." : reflection || "Sem reflexão livre registrada nesta passagem."}</p>
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
