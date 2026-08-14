import { artworkVersions, artworks, fileAssets, journeyEntries } from "@swd/database";
import { and, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { CROMA_CANON } from "../../game/croma-canon";
import { creativeWorldSummary, deriveCreativeTerritories, nextAtlasMission } from "../../game/atlas-world";
import { derivePlayerRank } from "../../game/progression";
import { getJourneyArtworkPreview } from "../../server/artwork-archive";
import { getAlphaRepository, getDatabase, getPixelExpeditionRepository, getStorage, getStudioEvidenceRepository } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";
import "./journey-v13.css";
import "./atlas-v17.css";
import "./atlas-creative-v15.css";

export const dynamic = "force-dynamic";

async function artworkPreview(userId: string, mode: "BASELINE" | "REVISIT") {
  const db = getDatabase();
  const condition = mode === "BASELINE"
    ? and(eq(artworks.ownerUserId, userId), eq(artworks.type, "BASELINE"))
    : and(eq(artworks.ownerUserId, userId), eq(sql`lower(${artworks.title})`, "drawing zero revisited"));
  const [row] = await db.select({ id: artworks.id, title: artworks.title, storageKey: fileAssets.storageKey })
    .from(artworks)
    .innerJoin(artworkVersions, eq(artworkVersions.id, artworks.currentVersionId))
    .innerJoin(fileAssets, eq(fileAssets.id, artworkVersions.fileAssetId))
    .where(condition)
    .limit(1);
  return row ? { ...row, imageUrl: await getStorage().createPrivateReadUrl(row.storageKey) } : null;
}

export default async function JourneyPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    return <main className="flow-shell"><section className="flow-card"><p className="eyebrow">{CROMA_CANON.atlas}</p><h1 className="flow-title">Seu mapa começa com uma primeira evidência.</h1><p className="lead compact">O Drawing Zero registra seu ponto de partida. Depois disso, o Atlas revela regiões, santuários e mudanças reais de processo.</p><div className="flow-actions"><Link className="primary link-button" href="/drawing-zero">Começar Drawing Zero</Link><Link className="secondary link-button" href="/codex">Conhecer Croma</Link></div></section></main>;
  }

  const db = getDatabase();
  const [entries, baseline, revisit, alpha, pixel, studio] = await Promise.all([
    db.select().from(journeyEntries).where(eq(journeyEntries.userId, userId)).orderBy(desc(journeyEntries.occurredAt)),
    artworkPreview(userId, "BASELINE"),
    artworkPreview(userId, "REVISIT"),
    getAlphaRepository().getSnapshot(userId),
    getPixelExpeditionRepository().getSnapshot(userId),
    getStudioEvidenceRepository().getSnapshot(userId),
  ]);

  const creativeTerritories = deriveCreativeTerritories(pixel, studio);
  const creativeSummary = creativeWorldSummary(creativeTerritories);
  const worldDomains = [...alpha.domains, ...creativeTerritories];
  const rank = derivePlayerRank(worldDomains);
  const graduation = entries.find((entry) => entry.type === "ALPHA_GATE") ?? null;
  const foundationComplete = Boolean(graduation) || alpha.status === "READY" || alpha.status === "READY_WITH_REVIEW";
  const recommended = nextAtlasMission(foundationComplete, alpha.nextAction, creativeTerritories);
  const foundationCovered = alpha.domains.filter((domain) => domain.evidenceCount > 0).length;
  const worldComplete = foundationCovered === alpha.domains.length && creativeSummary.complete;

  const items = await Promise.all(entries.map(async (entry) => {
    if (!entry.artworkId) return { ...entry, imageUrl: null, imageVersionNumber: null, imageSource: null };
    const metadata = entry.metadata && typeof entry.metadata === "object" ? entry.metadata as Record<string, unknown> : {};
    const historicalVersion = (entry.type === "ARTWORK_CREATED" || entry.type === "ARTWORK_VERSION") && typeof metadata.versionNumber === "number"
      ? metadata.versionNumber
      : null;
    const preview = await getJourneyArtworkPreview(userId, entry.artworkId, historicalVersion);
    return {
      ...entry,
      imageUrl: preview?.imageUrl ?? null,
      imageVersionNumber: preview?.versionNumber ?? null,
      imageSource: preview?.source ?? null,
    };
  }));

  const describe = (item: (typeof items)[number]) => {
    const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata as Record<string, unknown> : {};
    if (item.type === "DRAWING_ZERO") return "Seu ponto de partida privado.";
    if (item.type === "ALPHA_GATE") return "Arco Foundation demonstrado com Evidence real.";
    if (item.type === "PIXEL_EXPEDITION_COMPLETED") return "As quatro leis do Pixel foram demonstradas e o Emblema da Síntese foi formado.";
    if (item.type === "STUDIO_MISSION_COMPLETED" && typeof metadata.reward === "string") return `${metadata.reward} registrado como Evidence criativa.`;
    if (item.type === "ARTWORK_VERSION") return `Nova versão preservada${typeof metadata.versionNumber === "number" ? ` · v${metadata.versionNumber}` : ""}.`;
    if (item.type === "ARTWORK_CREATED") return "Criação adicionada ao seu corpo de trabalho.";
    if (typeof metadata.transformation === "string") return metadata.transformation;
    if (typeof metadata.description === "string") return metadata.description;
    return "Marco registrado no Atlas.";
  };

  const mapPositions = ["north", "east", "south", "west"] as const;

  return (
    <main className="atlas-world-shell atlas-world-v15">
      <header className="atlas-world-command">
        <div>
          <p className="eyebrow">{CROMA_CANON.atlas} · Sociedade Croma</p>
          <h1>Seu mundo cresce quando sua habilidade cresce.</h1>
          <p>Foundation abre as quatro regiões-raiz. Os Ateliers criativos erguem santuários permanentes quando suas missões são demonstradas com Evidence real.</p>
          <div className="atlas-world-ledger" aria-label="Resumo territorial">
            <span><b>{foundationCovered}/{alpha.domains.length}</b> regiões Foundation</span>
            <span><b>{creativeSummary.completed}/{creativeSummary.total}</b> territórios criativos</span>
            <span><b>{rank.coveredDomains}/{worldDomains.length}</b> territórios com Evidence</span>
          </div>
        </div>
        <div className={`atlas-player-rank ${worldComplete ? "world-complete" : ""}`}>
          <span>TÍTULO DO MUNDO</span><strong>{rank.title}</strong><small>{rank.totalEvidence} evidências · {rank.coveredDomains}/{worldDomains.length} territórios explorados</small>
          <div className="atlas-rank-seal" aria-hidden="true">{worldComplete ? "✦" : "C"}</div>
        </div>
      </header>

      <section className="atlas-world-board atlas-world-board-v15" aria-label="Mapa vivo do Atlas do Olhar">
        <div className="atlas-map-ink" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="atlas-croma-center">
          <span className="atlas-croma-avatar" aria-hidden="true">C</span>
          <small>CROMA OBSERVA</small>
          <strong>{rank.title}</strong>
          <p>{rank.description}</p>
          <span className="atlas-center-progress">{rank.coveredDomains}/{worldDomains.length} TERRITÓRIOS</span>
        </div>

        {alpha.domains.map((domain, index) => {
          const hasEvidence = domain.evidenceCount > 0;
          const position = mapPositions[index % mapPositions.length];
          return (
            <Link href={domain.href} key={domain.skillKey} className={`atlas-world-region region-${position} ${hasEvidence ? "has-evidence" : "no-evidence"}`}>
              <span>REGIÃO FOUNDATION {String(index + 1).padStart(2, "0")}</span>
              <strong>{domain.domain}</strong>
              <b>{domain.masteryScore == null ? "A explorar" : `${Math.round(domain.masteryScore * 100)}%`}</b>
              <small>{domain.evidenceCount} evidência(s) · {domain.masteryLevel ?? "sem medição"}</small>
            </Link>
          );
        })}

        <div className="atlas-creative-layer" aria-label="Territórios criativos">
          {creativeTerritories.map((territory) => (
            <Link href={territory.href} key={territory.key} className={`atlas-creative-sanctum sanctum-${territory.key} ${territory.complete ? "is-complete" : territory.evidenceCount > 0 ? "is-awake" : "is-dormant"}`}>
              <div className="atlas-sanctum-seal" aria-hidden="true">{territory.complete ? "◆" : territory.glyph}</div>
              <span>SANTUÁRIO CRIATIVO</span>
              <strong>{territory.title}</strong>
              <small>{territory.discipline}</small>
              <div className="atlas-sanctum-progress"><i style={{ width: `${Math.round(territory.progress * 100)}%` }} /></div>
              <p>{territory.complete ? territory.reward : `${territory.completedSteps}/${territory.totalSteps} rito(s) demonstrado(s)`}</p>
              <b>{territory.masteryScore == null ? "A despertar" : `${Math.round(territory.masteryScore * 100)}% mastery`}</b>
            </Link>
          ))}
        </div>

        <aside className={`atlas-world-next next-${recommended.kind}`}>
          <span>{recommended.kind === "capstone" ? "CÂMARA DA OBRA" : "MISSÃO RECOMENDADA"}</span>
          <strong>{recommended.title}</strong>
          <p>{recommended.description}</p>
          <Link href={recommended.href}>{recommended.kind === "capstone" ? "Criar obra autoral" : "Entrar na missão"} →</Link>
        </aside>
      </section>

      <section className="atlas-reliquary" aria-labelledby="atlas-reliquary-title">
        <div className="atlas-section-head"><div><p className="eyebrow">Relicário dos Ateliers</p><h2 id="atlas-reliquary-title">Sigilos que existem porque você demonstrou habilidade</h2></div><span>{creativeSummary.completed}/{creativeSummary.total} territórios consagrados</span></div>
        <div className="atlas-relic-grid">
          {creativeTerritories.map((territory) => <Link href={territory.href} key={territory.key} className={`atlas-relic relic-${territory.key} ${territory.complete ? "is-earned" : ""}`}><div className="atlas-relic-glyph" aria-hidden="true">{territory.complete ? "◆" : "◇"}</div><div><span>{territory.reward}</span><strong>{territory.title}</strong><p>{territory.description}</p></div><b>{territory.complete ? "EVIDENCE ✓" : "AINDA NÃO DESPERTADO"}</b></Link>)}
          <Link href="/create/work" className={`atlas-relic atlas-relic-capstone ${worldComplete ? "is-earned" : ""}`}><div className="atlas-relic-glyph" aria-hidden="true">✦</div><div><span>CÂMARA DA OBRA</span><strong>Convergência autoral</strong><p>Use gesto, percepção, forma e os três Ateliers criativos em uma peça que não segue um exercício pronto.</p></div><b>{worldComplete ? "MUNDO ABERTO" : "EXPLORE OS TERRITÓRIOS"}</b></Link>
        </div>
      </section>

      <section className="atlas-milestones" aria-labelledby="atlas-milestones-title">
        <div className="atlas-section-head"><div><p className="eyebrow">Marcos do Aprendiz</p><h2 id="atlas-milestones-title">Evidências que mudaram o mapa</h2></div><Link href="/create">Criar nova evidência →</Link></div>
        <div className="atlas-milestone-grid">
          {baseline && revisit ? <article className="atlas-milestone before-after"><span>ANTES / DEPOIS</span><div><img src={baseline.imageUrl} alt="Drawing Zero original" /><img src={revisit.imageUrl} alt="Drawing Zero revisitado" /></div><strong>Drawing Zero</strong><p>Compare processo, proporção, simplificação e volume.</p></article> : null}
          {graduation ? <article className="atlas-milestone graduation"><span>ARCO CONCLUÍDO</span><div className="milestone-seal">✦</div><strong>Foundation Alpha</strong><p>Primeiro arco integrado demonstrado com Evidence real.</p></article> : null}
          {items.slice(0, baseline && revisit ? 2 : 3).map((item) => <article className="atlas-milestone" key={item.id}>{item.imageUrl ? <div className="milestone-preview-wrap"><img className="milestone-preview" src={item.imageUrl} alt={`Evidência privada${item.imageVersionNumber ? ` v${item.imageVersionNumber}` : ""}`} />{item.imageVersionNumber ? <span>{`VISUAL V${item.imageVersionNumber}`}</span> : null}</div> : <div className="milestone-seal">{item.type === "ARTWORK_CREATED" ? "✎" : item.type === "STUDIO_MISSION_COMPLETED" ? "◆" : "◇"}</div>}<span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.occurredAt)}</span><strong>{item.title}</strong><p>{describe(item)}</p>{item.artworkId ? <Link href={`/create/${item.artworkId}`}>Abrir criação →</Link> : null}</article>)}
          {items.length === 0 && !graduation && !(baseline && revisit) ? <article className="atlas-milestone empty"><div className="milestone-seal">C</div><strong>O mapa espera sua primeira marca.</strong><p>Entre em um Atelier e produza uma evidência.</p><Link href="/create">Abrir Atelier Livre →</Link></article> : null}
        </div>
      </section>

      <details className="atlas-archive">
        <summary><span>Arquivo completo do Atlas</span><b>{items.length} registros</b></summary>
        <div className="atlas-archive-list">
          {items.map((item) => <article key={item.id}>{item.imageUrl ? <div className="atlas-archive-image"><img src={item.imageUrl} alt={`Evidência privada${item.imageVersionNumber ? ` v${item.imageVersionNumber}` : ""}`} />{item.imageVersionNumber ? <small>{`VISUAL V${item.imageVersionNumber}`}</small> : null}</div> : <span className="archive-glyph">{item.type === "STUDIO_MISSION_COMPLETED" ? "◆" : "◇"}</span>}<div><small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.occurredAt)}</small><strong>{item.title}</strong><p>{describe(item)}</p>{item.artworkId ? <Link href={`/create/${item.artworkId}`}>Abrir histórico →</Link> : null}</div></article>)}
          {items.length === 0 ? <p>Nenhum registro arquivado ainda.</p> : null}
        </div>
      </details>

      <footer className="atlas-world-actions"><Link className="secondary link-button" href="/codex">Codex Croma</Link><div><Link className="secondary link-button" href="/skills">Habilidades</Link><Link className="primary link-button" href="/create">Atelier Livre</Link></div></footer>
    </main>
  );
}
