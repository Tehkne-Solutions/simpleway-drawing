import { artworkVersions, artworks, fileAssets, journeyEntries } from "@swd/database";
import { and, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { CROMA_CANON } from "../../game/croma-canon";
import { derivePlayerRank } from "../../game/progression";
import { getAlphaRepository, getDatabase, getStorage } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";
import "./journey-v13.css";
import "./atlas-v17.css";

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
    return <main className="flow-shell"><section className="flow-card"><p className="eyebrow">{CROMA_CANON.atlas}</p><h1 className="flow-title">Seu mapa começa com uma primeira evidência.</h1><p className="lead compact">O Drawing Zero registra seu ponto de partida. Depois disso, o Atlas revela regiões, marcos e mudanças reais de processo.</p><div className="flow-actions"><Link className="primary link-button" href="/drawing-zero">Começar Drawing Zero</Link><Link className="secondary link-button" href="/codex">Conhecer Croma</Link></div></section></main>;
  }

  const db = getDatabase();
  const [entries, baseline, revisit, alpha] = await Promise.all([
    db.select().from(journeyEntries).where(eq(journeyEntries.userId, userId)).orderBy(desc(journeyEntries.occurredAt)),
    artworkPreview(userId, "BASELINE"),
    artworkPreview(userId, "REVISIT"),
    getAlphaRepository().getSnapshot(userId),
  ]);
  const rank = derivePlayerRank(alpha.domains);
  const graduation = entries.find((entry) => entry.type === "ALPHA_GATE") ?? null;
  const items = await Promise.all(entries.map(async (entry) => {
    if (!entry.artworkId) return { ...entry, imageUrl: null };
    const [row] = await db.select({ storageKey: fileAssets.storageKey }).from(artworks)
      .innerJoin(artworkVersions, eq(artworkVersions.id, artworks.currentVersionId))
      .innerJoin(fileAssets, eq(fileAssets.id, artworkVersions.fileAssetId))
      .where(eq(artworks.id, entry.artworkId)).limit(1);
    return { ...entry, imageUrl: row ? await getStorage().createPrivateReadUrl(row.storageKey) : null };
  }));

  const describe = (item: (typeof items)[number]) => {
    const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata as Record<string, unknown> : {};
    if (item.type === "DRAWING_ZERO") return "Seu ponto de partida privado.";
    if (item.type === "ALPHA_GATE") return "Arco Foundation demonstrado com Evidence real.";
    if (item.type === "ARTWORK_VERSION") return `Nova versão preservada${typeof metadata.versionNumber === "number" ? ` · v${metadata.versionNumber}` : ""}.`;
    if (item.type === "ARTWORK_CREATED") return "Criação adicionada ao seu corpo de trabalho.";
    if (typeof metadata.transformation === "string") return metadata.transformation;
    if (typeof metadata.description === "string") return metadata.description;
    return "Marco registrado no Atlas.";
  };

  const mapPositions = ["north", "east", "south", "west"] as const;

  return (
    <main className="atlas-world-shell">
      <header className="atlas-world-command">
        <div>
          <p className="eyebrow">{CROMA_CANON.atlas} · Sociedade Croma</p>
          <h1>Seu mundo cresce quando sua habilidade cresce.</h1>
          <p>O Atlas não premia presença. Cada região responde às evidências reais que você produz nos Ateliers.</p>
        </div>
        <div className="atlas-player-rank">
          <span>TÍTULO ATUAL</span><strong>{rank.title}</strong><small>{rank.totalEvidence} evidências · {rank.coveredDomains}/{alpha.domains.length} regiões exploradas</small>
        </div>
      </header>

      <section className="atlas-world-board" aria-label="Mapa do Atlas do Olhar">
        <div className="atlas-map-ink" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="atlas-croma-center">
          <span className="atlas-croma-avatar" aria-hidden="true">C</span>
          <small>CROMA OBSERVA</small>
          <strong>{rank.title}</strong>
          <p>{rank.description}</p>
        </div>

        {alpha.domains.map((domain, index) => {
          const hasEvidence = domain.evidenceCount > 0;
          const position = mapPositions[index % mapPositions.length];
          return (
            <Link href={domain.href} key={domain.skillKey} className={`atlas-world-region region-${position} ${hasEvidence ? "has-evidence" : "no-evidence"}`}>
              <span>REGIÃO {String(index + 1).padStart(2, "0")}</span>
              <strong>{domain.domain}</strong>
              <b>{domain.masteryScore == null ? "A explorar" : `${Math.round(domain.masteryScore * 100)}%`}</b>
              <small>{domain.evidenceCount} evidência(s) · {domain.masteryLevel ?? "sem medição"}</small>
            </Link>
          );
        })}

        <aside className="atlas-world-next">
          <span>MISSÃO RECOMENDADA</span>
          <strong>{alpha.nextAction.title}</strong>
          <p>{alpha.nextAction.description}</p>
          <Link href={alpha.nextAction.href}>Entrar na missão →</Link>
        </aside>
      </section>

      <section className="atlas-milestones" aria-labelledby="atlas-milestones-title">
        <div className="atlas-section-head"><div><p className="eyebrow">Marcos do Aprendiz</p><h2 id="atlas-milestones-title">Evidências que mudaram o mapa</h2></div><Link href="/create">Criar nova evidência →</Link></div>
        <div className="atlas-milestone-grid">
          {baseline && revisit ? <article className="atlas-milestone before-after"><span>ANTES / DEPOIS</span><div><img src={baseline.imageUrl} alt="Drawing Zero original" /><img src={revisit.imageUrl} alt="Drawing Zero revisitado" /></div><strong>Drawing Zero</strong><p>Compare processo, proporção, simplificação e volume.</p></article> : null}
          {graduation ? <article className="atlas-milestone graduation"><span>ARCO CONCLUÍDO</span><div className="milestone-seal">✦</div><strong>Foundation Alpha</strong><p>Primeiro arco integrado demonstrado com Evidence real.</p></article> : null}
          {items.slice(0, baseline && revisit ? 2 : 3).map((item) => <article className="atlas-milestone" key={item.id}>{item.imageUrl ? <img className="milestone-preview" src={item.imageUrl} alt="Evidência privada da jornada" /> : <div className="milestone-seal">{item.type === "ARTWORK_CREATED" ? "✎" : "◇"}</div>}<span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.occurredAt)}</span><strong>{item.title}</strong><p>{describe(item)}</p>{item.artworkId ? <Link href={`/create/${item.artworkId}`}>Abrir criação →</Link> : null}</article>)}
          {items.length === 0 && !graduation && !(baseline && revisit) ? <article className="atlas-milestone empty"><div className="milestone-seal">C</div><strong>O mapa espera sua primeira marca.</strong><p>Entre em um Atelier e produza uma evidência.</p><Link href="/create">Abrir Atelier Livre →</Link></article> : null}
        </div>
      </section>

      <details className="atlas-archive">
        <summary><span>Arquivo completo do Atlas</span><b>{items.length} registros</b></summary>
        <div className="atlas-archive-list">
          {items.map((item) => <article key={item.id}>{item.imageUrl ? <img src={item.imageUrl} alt="Evidência privada" /> : <span className="archive-glyph">◇</span>}<div><small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.occurredAt)}</small><strong>{item.title}</strong><p>{describe(item)}</p>{item.artworkId ? <Link href={`/create/${item.artworkId}`}>Abrir histórico →</Link> : null}</div></article>)}
          {items.length === 0 ? <p>Nenhum registro arquivado ainda.</p> : null}
        </div>
      </details>

      <footer className="atlas-world-actions"><Link className="secondary link-button" href="/codex">Codex Croma</Link><div><Link className="secondary link-button" href="/skills">Habilidades</Link><Link className="primary link-button" href="/create">Atelier Livre</Link></div></footer>
    </main>
  );
}
