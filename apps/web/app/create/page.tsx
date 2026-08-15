import Link from "next/link";
import { CromaCoach } from "../components/croma-coach";
import { getArtworkLibrary } from "../../server/artwork-archive";
import { getPlayerContinuity } from "../../server/player-continuity";
import { getSessionUserId } from "../../server/session";
import { ArtworkForm } from "./artwork-form";
import "./isometric/isometric-v13.css";

const typeLabel: Record<string, string> = { BASELINE: "Baseline", STUDY: "Estudo", SKETCH: "Sketch", PROJECT: "Projeto", ARTWORK: "Artwork" };
const sourceLabel: Record<string, string> = { CANVAS: "Câmara da Obra", UPLOAD: "Upload", PHOTO: "Foto" };

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const userId = await getSessionUserId();
  const [artworks, continuity] = userId
    ? await Promise.all([getArtworkLibrary(userId), getPlayerContinuity(userId)])
    : [[], null];
  const { mode } = await searchParams;
  const alphaMode = mode === "revisit" || mode === "capstone";
  const preset = mode === "revisit"
    ? { type: "STUDY" as const, title: "Drawing Zero Revisited", notes: "Mesma referência do Drawing Zero. Compare processo, proporção, simplificação e volume." }
    : mode === "capstone"
      ? { type: "PROJECT" as const, title: "Alpha Capstone · Build It", notes: "Observe → simplifique → construa em volume → corrija → crie uma variação própria." }
      : { type: "STUDY" as const, title: "", notes: "" };
  const normalAction = continuity?.phase === "AUTHORING"
    ? { title: "A Câmara da Obra está aberta.", message: "Você já atravessou Foundation e os territórios medidos. Agora combine construção e tinta em uma obra autoral dentro do próprio app.", label: "Entrar na Câmara da Obra", href: "/create/work" }
    : continuity?.phase === "CREATIVE_WORLD"
      ? { title: "Continue o território que já respondeu.", message: continuity.nextAction.description, label: "Seguir a Bússola", href: continuity.nextAction.href }
      : { title: "Hoje há uma expedição completa esperando por você.", message: "A Expedição da Síntese conecta quatro oficinas em uma campanha: forma, movimento, continuidade e tempo. O progresso é lido do que você realmente produz nos canvases.", label: "Jogar Expedição da Síntese", href: "/create/pixel/quest" };
  const cromaState = alphaMode ? "challenge" as const : continuity?.phase === "FOUNDATION" || !continuity ? "teach" as const : "guide" as const;

  return (
    <main className="flow-shell">
      <section className="flow-card create-card">
        <div>
          <p className="eyebrow">{alphaMode ? "Rito Alpha · Portal da Prova" : "Atelier Livre"}</p>
          <h1 className="flow-title">{alphaMode ? "Registre a prova sem perder o fio do rito." : "Crie dentro do app. Registre o mundo de fora quando quiser."}</h1>
          <p className="lead compact">{alphaMode ? "O Rito já definiu a identidade canônica deste registro. Você cuida da obra; o sistema cuida de reconhecê-la e devolver você ao selo correto." : "O SimpleWay Drawing trata criação como prática jogável. Canvases especializados e a Câmara da Obra são ferramentas principais; upload pelo celular ou PC continua como recurso complementar."}</p>
        </div>

        {mode === "revisit" ? <aside className="lesson-checkpoint">Prova do Espelho: use a mesma referência e condições gerais do Drawing Zero. Não procure “embelezar”: queremos observar mudança de processo.</aside> : null}
        {mode === "capstone" ? <aside className="lesson-checkpoint">Prova da Obra: escolha um objeto real, mapeie shapes, construa forms e crie uma variação autoral.</aside> : null}

        <CromaCoach
          eyebrow={alphaMode ? "Croma · Rito Alpha" : "Croma · Atelier Livre"}
          title={alphaMode ? "A prova já está preparada." : normalAction.title}
          message={alphaMode ? "Tipo e identificação canônica ficam protegidos nesta passagem. Depois do registro, você retorna ao Rito para ver o selo responder." : normalAction.message}
          actionLabel={alphaMode ? "Voltar ao Rito Alpha" : normalAction.label}
          actionHref={alphaMode ? "/alpha" : normalAction.href}
          tone="veronese"
          state={cromaState}
        />

        <section className="studio-launchpad" aria-labelledby="studio-title">
          <div className="studio-launchpad-head">
            <div><p className="eyebrow">Ferramentas do Atelier</p><h2 id="studio-title">Escolha uma missão, um canvas ou entre na Câmara.</h2></div>
            <Link className="secondary link-button" href="/journey">Abrir Atlas do Olhar</Link>
          </div>
          <div className="studio-mode-grid">
            <Link className="studio-mode-card is-playable realistic" href="/create/work"><small>Atelier Autoral</small><strong>Câmara da Obra</strong><p>Canvas livre com construção, tinta, pigmentos, guias, undo/redo e registro privado direto no Atlas.</p></Link>
            <Link className="studio-mode-card is-playable" href="/create/pixel/quest"><small>Campanha jogável · 4 missões</small><strong>Expedição da Síntese</strong><p>Recupere quatro sigilos dominando forma, movimento, continuidade e tempo em Pixel Art.</p></Link>
            <Link className="studio-mode-card is-playable" href="/create/pixel"><small>Atelier da Síntese</small><strong>Pixel Studio</strong><p>Grid pixel-a-pixel, Sprite Lab, Tile Lab, Animation Lab, paletas limitadas e export para produção.</p></Link>
            <Link className="studio-mode-card is-playable" href="/create/isometric"><small>Atelier da Estrutura</small><strong>Canvas Isométrico</strong><p>Grade 30°, snap, segmentos estruturais, traço livre e missão de construção espacial.</p></Link>
            <Link className="studio-mode-card is-playable manga" href="/create/manga"><small>Atelier da Narrativa</small><strong>Manga Canvas</strong><p>Crânio, eixo, olhos, mandíbula, terços e vistas frente, 3/4 e perfil para construção de personagem.</p></Link>
            <article className="studio-mode-card is-upcoming comic" aria-disabled="true"><small>Próxima oficina</small><strong>Comic Canvas</strong><p>Painéis, storytelling, composição, perspectiva e ritmo visual de página.</p></article>
            <article className="studio-mode-card is-upcoming realistic" aria-disabled="true"><small>Próxima oficina</small><strong>Realistic Canvas</strong><p>Envelope, medição, block-in, eixos, planos, luz e comparação visual.</p></article>
          </div>
        </section>

        <details className="create-secondary-drawer" open={alphaMode}>
          <summary><div><span>{alphaMode ? "Registro da Prova" : "Registro externo"}</span><strong>{alphaMode ? preset.title : "Trazer estudo feito fora do app"}</strong></div></summary>
          <div className="create-secondary-drawer-body create-external-register" id="registro-externo">
            <p className="compact">{alphaMode ? "Envie a evidência visual da prova. Notas do processo continuam livres; tipo e título permanecem canônicos para o Rito reconhecê-la." : "Fotografou um sketchbook ou desenhou em outro software? Registre aqui para preservar a evolução no Atlas. Esse fluxo é complementar aos Studios e à Câmara."}</p>
            <ArtworkForm initialType={preset.type} initialTitle={preset.title} initialNotes={preset.notes} lockPreset={alphaMode} {...(alphaMode ? { returnTo: "/alpha" } : {})} />
          </div>
        </details>

        <details className="create-secondary-drawer">
          <summary><div><span>Arquivo Vivo do Atelier</span><strong>{artworks.length ? `${artworks.length} obra(s) preservada(s)` : "Suas obras aparecem aqui"}</strong></div></summary>
          <div className="create-secondary-drawer-body create-library">
            <div className="section-heading"><div><p className="eyebrow">Arquivo Vivo do Atelier</p><h2>Suas obras são visuais antes de serem registros.</h2></div><Link href="/journey" className="secondary link-button">Ver Atlas</Link></div>
            {artworks.length === 0 ? <div className="empty-create"><strong>Ainda não há registros no arquivo.</strong><span>Seu primeiro estudo salvo aparecerá aqui e no Atlas do Olhar.</span></div> : (
              <div className="artwork-grid artwork-grid-visual">
                {artworks.map((artwork) => (
                  <Link key={artwork.id} href={`/create/${artwork.id}`} className="artwork-tile artwork-tile-visual">
                    <div className="artwork-tile-preview">
                      <img src={artwork.imageUrl} alt={`Versão atual de ${artwork.title ?? "obra"}`} />
                      <span className="artwork-version-badge">VERSÃO ATUAL · V{artwork.versionNumber}</span>
                    </div>
                    <div className="artwork-tile-copy">
                      <span className="artwork-type">{typeLabel[artwork.type] ?? artwork.type}</span>
                      <h3>{artwork.title ?? "Sem título"}</h3>
                      <p>{sourceLabel[artwork.source] ?? artwork.source} · {artwork.visibility === "PRIVATE" ? "Privado" : artwork.visibility}</p>
                      <small>Atualizado {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(artwork.updatedAt)}</small>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </details>
        <div className="flow-actions"><Link className="secondary link-button" href={alphaMode ? "/alpha" : "/"}>{alphaMode ? "Voltar ao Rito Alpha" : "Voltar à Home"}</Link></div>
      </section>
    </main>
  );
}
