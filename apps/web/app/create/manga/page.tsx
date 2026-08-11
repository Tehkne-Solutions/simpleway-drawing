import Link from "next/link";
import { MangaCanvas } from "./manga-canvas";
import "./manga-v13.css";

export default function MangaPracticePage() {
  return (
    <main className="manga-page game-studio-page">
      <header className="manga-page-head game-studio-head">
        <div>
          <p className="eyebrow">Manga 01 · Atelier da Narrativa</p>
          <h1>Construa o personagem antes de estilizar.</h1>
        </div>
        <Link className="secondary link-button" href="/create">Sair do Studio</Link>
      </header>
      <div className="game-studio-body">
        <MangaCanvas />
      </div>
    </main>
  );
}
