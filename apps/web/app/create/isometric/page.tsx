import Link from "next/link";
import { IsometricCanvas } from "./isometric-canvas";
import "./isometric-v13.css";

export default function IsometricPracticePage() {
  return (
    <main className="iso-page game-studio-page">
      <header className="iso-page-head game-studio-head">
        <div>
          <p className="eyebrow">Estrutura 001 · Canvas Isométrico</p>
          <h1>Desenhe espaço em duas dimensões.</h1>
        </div>
        <Link className="secondary link-button" href="/create">Sair do Studio</Link>
      </header>
      <div className="game-studio-body">
        <IsometricCanvas />
      </div>
    </main>
  );
}
