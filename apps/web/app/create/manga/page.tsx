import Link from "next/link";
import { CromaCoach } from "../../../components/croma-coach";
import { MangaCanvas } from "./manga-canvas";
import "./manga-v13.css";

export default function MangaPracticePage() {
  return (
    <main className="manga-page">
      <header className="manga-page-head">
        <div>
          <p className="eyebrow">Atelier da Narrativa · Manga Canvas</p>
          <h1>Construa o personagem antes de estilizar.</h1>
          <p>Treine cabeça e rosto com guias opcionais de crânio, eixo, olhos, mandíbula e terços. Alterne entre frente, 3/4 e perfil e preserve seus próprios traços sobre a construção.</p>
        </div>
        <Link className="secondary link-button" href="/create">Voltar ao Atelier Livre</Link>
      </header>

      <CromaCoach
        eyebrow="Missão de Croma · Manga 01"
        title="Primeiro enxergue o volume; depois desenhe olhos, cabelo e expressão."
        message="As guias são assistência visual. A missão não avalia se seu desenho é bonito: ela confirma se você passou pelo processo de construção antes do detalhe."
        actionLabel="Abrir Codex"
        actionHref="/codex"
        tone="terracotta"
      />

      <div className="manga-video-gate"><strong>Objetivo desta oficina</strong><p>Produza três estudos da mesma cabeça — frente, 3/4 e perfil — sem apagar as tentativas anteriores. Depois compare como eixo, linha dos olhos e mandíbula mudam em cada vista.</p></div>
      <MangaCanvas />
    </main>
  );
}
