import Link from "next/link";
import { getArtworkRepository } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";
import { ArtworkForm } from "./artwork-form";

const typeLabel: Record<string, string> = { BASELINE: "Baseline", STUDY: "Estudo", SKETCH: "Sketch", PROJECT: "Projeto", ARTWORK: "Artwork" };

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const userId = await getSessionUserId();
  const artworks = userId ? await getArtworkRepository().listOwned(userId) : [];
  const { mode } = await searchParams;
  const preset = mode === "revisit"
    ? { type: "STUDY" as const, title: "Drawing Zero Revisited", notes: "Mesma referência do Drawing Zero. Compare processo, proporção, simplificação e volume." }
    : mode === "capstone"
      ? { type: "PROJECT" as const, title: "Alpha Capstone · Build It", notes: "Observe → simplifique → construa em volume → corrija → crie uma variação própria." }
      : { type: "STUDY" as const, title: "", notes: "" };

  return (
    <main className="flow-shell">
      <section className="flow-card create-card">
        <div><p className="eyebrow">Create</p><h1 className="flow-title">Construa seu corpo de trabalho.</h1><p className="lead compact">Registre estudos, sketches, projetos e artworks. Cada nova versão preserva o processo em vez de apagar o que veio antes.</p></div>
        {mode === "revisit" ? <aside className="lesson-checkpoint">Use a mesma referência e condições gerais do Drawing Zero. Não procure “embelezar”: queremos observar mudança de processo.</aside> : null}
        {mode === "capstone" ? <aside className="lesson-checkpoint">Capstone: escolha um objeto real, mapeie shapes, construa forms e crie uma variação autoral.</aside> : null}
        <ArtworkForm initialType={preset.type} initialTitle={preset.title} initialNotes={preset.notes} />
        <section className="create-library">
          <div className="section-heading"><div><p className="eyebrow">Sua biblioteca</p><h2>Criações privadas</h2></div><Link href="/journey" className="secondary link-button">Ver Journey</Link></div>
          {artworks.length === 0 ? <div className="empty-create"><strong>Ainda não há criações aqui.</strong><span>Seu primeiro registro aparecerá nesta biblioteca e no Journey.</span></div> : <div className="artwork-grid">{artworks.map((artwork) => <Link key={artwork.id} href={`/create/${artwork.id}`} className="artwork-tile"><span className="artwork-type">{typeLabel[artwork.type] ?? artwork.type}</span><h3>{artwork.title ?? "Sem título"}</h3><p>{artwork.visibility === "PRIVATE" ? "Privado" : artwork.visibility} · atualizado {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(artwork.updatedAt)}</p></Link>)}</div>}
        </section>
        <div className="flow-actions"><Link className="secondary link-button" href="/">Voltar à Home</Link></div>
      </section>
    </main>
  );
}
