import Link from "next/link";
import { CROMA_CANON } from "../../game/croma-canon";
import { getArtworkRepository } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";
import { ArtworkForm } from "./artwork-form";
import "./isometric/isometric-v13.css";

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
        <div>
          <p className="eyebrow">Atelier Livre</p>
          <h1 className="flow-title">Crie dentro do app. Registre o mundo de fora quando quiser.</h1>
          <p className="lead compact">O SimpleWay Drawing passa a tratar criação como prática jogável. Canvases especializados entram como ferramentas principais; upload pelo celular ou PC permanece como recurso complementar.</p>
        </div>

        {mode === "revisit" ? <aside className="lesson-checkpoint">Use a mesma referência e condições gerais do Drawing Zero. Não procure “embelezar”: queremos observar mudança de processo.</aside> : null}
        {mode === "capstone" ? <aside className="lesson-checkpoint">Capstone: escolha um objeto real, mapeie shapes, construa forms e crie uma variação autoral.</aside> : null}

        <section className="studio-launchpad" aria-labelledby="studio-title">
          <div className="studio-launchpad-head">
            <div><p className="eyebrow">Ferramentas do Atelier</p><h2 id="studio-title">Escolha como você quer praticar.</h2></div>
            <Link className="secondary link-button" href="/journey">Abrir Atlas do Olhar</Link>
          </div>
          <div className="studio-mode-grid">
            <Link className="studio-mode-card is-playable" href="/create/isometric">
              <small>Jogável agora</small><strong>Canvas Isométrico</strong><p>Grade 30°, snap, segmentos estruturais, traço livre e missão de construção espacial.</p>
            </Link>
            <article className="studio-mode-card is-upcoming manga" aria-disabled="true"><small>Próxima oficina</small><strong>Manga Canvas</strong><p>Guias de cabeça, rosto, corpo, painéis, linha de ação e construção de personagem.</p></article>
            <article className="studio-mode-card is-upcoming comic" aria-disabled="true"><small>Próxima oficina</small><strong>Comic Canvas</strong><p>Painéis, storytelling, composição, perspectiva e ritmo visual de página.</p></article>
            <article className="studio-mode-card is-upcoming realistic" aria-disabled="true"><small>Próxima oficina</small><strong>Realistic Canvas</strong><p>Envelope, medição, block-in, eixos, planos, luz e comparação visual.</p></article>
          </div>
        </section>

        <div className="croma-challenge">
          <div className="croma-seal" aria-hidden="true">C</div>
          <div><h3>{CROMA_CANON.shortName} recomenda começar pela estrutura.</h3><p>Missão inicial: construa um cubo no Canvas Isométrico e depois tente uma variação sem apagar o primeiro estudo.</p></div>
          <Link className="primary link-button" href="/create/isometric">Aceitar missão</Link>
        </div>

        <section className="create-external-register">
          <div className="section-heading"><div><p className="eyebrow">Registro externo</p><h2>Traga estudos feitos fora do app.</h2></div></div>
          <p className="compact">Fotografou um sketchbook ou desenhou em outro software? Registre aqui para preservar a evolução no Atlas. Esse fluxo é complementar ao Studio interno.</p>
          <ArtworkForm initialType={preset.type} initialTitle={preset.title} initialNotes={preset.notes} />
        </section>

        <section className="create-library">
          <div className="section-heading"><div><p className="eyebrow">Arquivo do Atelier</p><h2>Criações privadas</h2></div><Link href="/journey" className="secondary link-button">Ver Atlas</Link></div>
          {artworks.length === 0 ? <div className="empty-create"><strong>Ainda não há registros no arquivo.</strong><span>Seu primeiro estudo salvo aparecerá aqui e no Atlas do Olhar.</span></div> : <div className="artwork-grid">{artworks.map((artwork) => <Link key={artwork.id} href={`/create/${artwork.id}`} className="artwork-tile"><span className="artwork-type">{typeLabel[artwork.type] ?? artwork.type}</span><h3>{artwork.title ?? "Sem título"}</h3><p>{artwork.visibility === "PRIVATE" ? "Privado" : artwork.visibility} · atualizado {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(artwork.updatedAt)}</p></Link>)}</div>}
        </section>
        <div className="flow-actions"><Link className="secondary link-button" href="/">Voltar à Home</Link></div>
      </section>
    </main>
  );
}
