import Link from "next/link";
import { PixelCanvas } from "./pixel-canvas";
import "./pixel-v1.css";

export default function PixelPracticePage() {
  return (
    <main className="pixel-page game-studio-page">
      <header className="pixel-page-head game-studio-head">
        <div>
          <p className="eyebrow">Pixel 01 · Atelier da Síntese</p>
          <h1>Desenhe com menos pixels e decisões melhores.</h1>
        </div>
        <Link className="secondary link-button" href="/create">Sair do Studio</Link>
      </header>
      <div className="game-studio-body">
        <PixelCanvas />
      </div>
    </main>
  );
}
