import { artworkVersions, artworks, fileAssets, journeyEntries } from "@swd/database";
import { and, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { getDatabase, getStorage } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";

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
    return <main className="flow-shell"><section className="flow-card"><p className="eyebrow">Journey</p><h1 className="flow-title">Sua jornada começa no primeiro desenho.</h1><p className="lead compact">Faça o Drawing Zero para registrar seu ponto de partida.</p><div className="flow-actions"><Link className="primary link-button" href="/drawing-zero">Começar Drawing Zero</Link></div></section></main>;
  }

  const db = getDatabase();
  const [entries, baseline, revisit] = await Promise.all([
    db.select().from(journeyEntries).where(eq(journeyEntries.userId, userId)).orderBy(desc(journeyEntries.occurredAt)),
    artworkPreview(userId, "BASELINE"),
    artworkPreview(userId, "REVISIT"),
  ]);
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
        <p className="eyebrow">Your Art Journey</p>
        <h1 className="flow-title">Sua evolução começa a ficar visível.</h1>
        <p className="lead compact">Cada marco importante registra o que você conseguiu fazer naquele momento.</p>

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
        <div className="flow-actions split-actions"><Link className="secondary link-button" href="/">Voltar ao início</Link><Link className="primary link-button" href="/create">Criar agora</Link></div>
      </section>
    </main>
  );
}
