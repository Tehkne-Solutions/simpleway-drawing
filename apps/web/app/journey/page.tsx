import { artworkVersions, artworks, fileAssets, journeyEntries } from "@swd/database";
import { and, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { CROMA_CANON } from "../../game/croma-canon";
import { derivePlayerRank } from "../../game/progression";
import { getAlphaRepository, getDatabase, getStorage } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";
import "./journey-v13.css";

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
    return <main className="flow-shell"><section className="flow-card"><p className="eyebrow">{CROMA_CANON.atlas}</p><h1 className="flow-title">Seu mapa começa com uma primeira evidência.</h1><p className="lead compact">O Drawing Zero registra seu ponto de partida. Depois disso, o Atlas mostra habilidades, marcos e mudanças reais de processo.</p><div className="flow-actions"><Link className="primary link-button" href="/drawing-zero">Começar Drawing Zero</Link><Link className="secondary link-button" href="/codex">Conhecer Croma</Link></div></section></main>;
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

  return (
    <main className="flow-shell">
      <section className="flow-card">
        <p className="eyebrow">{CROMA_CANON.atlas}</p>
        <h1 className="flow-title">Seu mapa de evolução artística.</h1>
        <p className="lead compact">O Atlas não premia presença. Ele mostra evidência real: o que você praticou, onde já há domínio e qual é a próxima ação que pode mudar sua habilidade.</p>

        <section className="atlas-rank-v13" aria-label={`Rank atual: ${rank.title}`}>
          <div className="atlas-rank-mark" aria-hidden="true">{rank.coveredDomains || "C"}</div>
          <div><span className="atlas-croma-v13">Título da Sociedade Croma</span><strong>{rank.title}</strong><p>{rank.description}</p></div>
          <div className="atlas-rank-stats"><b>{rank.totalEvidence}</b>evidências reais · {rank.coveredDomains}/{alpha.domains.length} Ateliers medidos{rank.averageMastery == null ? "" : ` · ${Math.round(rank.averageMastery * 100)}% domínio médio`}</div>
        </section>

        <section className="atlas-map-v13" aria-labelledby="atlas-map-title">
          <div className="atlas-map-head">
            <div><span className="atlas-croma-v13">Croma observa o mapa</span><h2 id="atlas-map-title">Ateliers de domínio</h2><p>Cada região ganha força quando o sistema recebe evidências reais de prática. Entre onde há menos evidência para tornar a evolução visível.</p></div>
            <Link className="secondary link-button" href="/codex">Abrir Codex</Link>
          </div>
          <div className="atlas-path-v13">
            {alpha.domains.map((domain, index) => {
              const hasEvidence = domain.evidenceCount > 0;
              return (
                <Link href={domain.href} key={domain.skillKey} className={`atlas-node-v13 ${hasEvidence ? "has-evidence" : "no-evidence"}`}>
                  <span>REGIÃO {String(index + 1).padStart(2, "0")}</span>
                  <strong>{domain.domain}</strong>
                  <b>{domain.masteryScore == null ? "Sem medição" : `${Math.round(domain.masteryScore * 100)}% domínio`}</b>
                  <small>{domain.evidenceCount} evidência(s) · {domain.masteryLevel ?? "a explorar"}</small>
                </Link>
              );
            })}
          </div>
          <div className="atlas-next-v13">
            <div><span className="atlas-croma-v13">Próxima missão recomendada</span><strong>{alpha.nextAction.title}</strong><p>{alpha.nextAction.description}</p></div>
            <Link className="primary link-button" href={alpha.nextAction.href}>Ir para missão</Link>
          </div>
        </section>

        {graduation ? (
          <section className="journey-before-after">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Foundation Alpha · Graduation</p>
                <h2>Você concluiu o primeiro arco integrado.</h2>
              </div>
              <span className="alpha-status status-ready">Concluído</span>
            </div>
            <p>O fechamento combina currículo, prática deliberada, percepção, construção, forma e criação. A conclusão registra Evidence real — não apenas aulas assistidas.</p>
            <div className="alpha-domain-grid">
              {alpha.domains.map((domain) => (
                <Link href={domain.href} className="alpha-domain" key={domain.skillKey}>
                  <div><strong>{domain.domain}</strong><span>{domain.masteryLevel ?? "SEM EVIDÊNCIA"}</span></div>
                  <b>{domain.masteryScore == null ? "—" : `${Math.round(domain.masteryScore * 100)}%`}</b>
                  <small>{domain.evidenceCount} evidência(s)</small>
                </Link>
              ))}
            </div>
            <div className="flow-actions split-actions">
              <span>Concluído em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(graduation.occurredAt)}</span>
              <Link className="primary link-button" href="/skills">Continuar desenvolvendo habilidades</Link>
            </div>
          </section>
        ) : null}

        {baseline && revisit ? (
          <section className="journey-before-after">
            <div className="section-heading"><div><p className="eyebrow">Drawing Zero · Before / After</p><h2>Olhe para a mudança, não para perfeição.</h2></div><Link className="secondary link-button" href="/alpha">Abrir Alpha Gate</Link></div>
            <div className="before-after-grid">
              <article><span>BEFORE</span><img src={baseline.imageUrl} alt="Drawing Zero original" /><strong>Drawing Zero</strong></article>
              <article><span>AFTER</span><img src={revisit.imageUrl} alt="Drawing Zero revisitado" /><strong>Drawing Zero Revisited</strong></article>
            </div>
            <p>Compare proporção, grandes ângulos, simplificação e sensação de volume. A pergunta central é: <strong>seu processo de observação e construção mudou?</strong></p>
          </section>
        ) : null}

        <div className="journey-stack">
          {items.map((item) => {
            const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata as Record<string, unknown> : {};
            const description = item.type === "DRAWING_ZERO" ? "Este é seu baseline privado. Mais adiante vamos comparar sua evolução com ele."
              : item.type === "ALPHA_GATE" ? "O primeiro arco integrado da Foundation foi demonstrado com Evidence real."
              : item.type === "ARTWORK_VERSION" ? `Uma nova versão foi preservada no processo${typeof metadata.versionNumber === "number" ? ` · v${metadata.versionNumber}` : ""}.`
              : item.type === "ARTWORK_CREATED" ? "Uma criação entrou no seu corpo de trabalho e permanece privada por padrão."
              : typeof metadata.transformation === "string" ? metadata.transformation
              : typeof metadata.description === "string" ? metadata.description : "Marco registrado na sua jornada.";
            return <article className="journey-item" key={item.id}>{item.imageUrl ? <img src={item.imageUrl} alt="Artwork privada da jornada" style={{ width: "100%", maxHeight: 520, objectFit: "contain", borderRadius: 16, marginBottom: 18 }} /> : null}<p className="eyebrow">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.occurredAt)}</p><h2>{item.title}</h2><p>{description}</p>{item.artworkId ? <Link href={`/create/${item.artworkId}`} className="journey-art-link">Abrir histórico da criação →</Link> : null}</article>;
          })}
          {items.length === 0 ? <p>Nenhum marco registrado ainda.</p> : null}
        </div>
        <div className="flow-actions split-actions"><Link className="secondary link-button" href="/">Voltar ao início</Link><Link className="primary link-button" href="/create">Entrar no Atelier Livre</Link></div>
      </section>
    </main>
  );
}
