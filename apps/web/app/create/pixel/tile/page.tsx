import Link from "next/link";
import { PixelModeNav } from "../pixel-mode-nav";
import { TileLab } from "./tile-lab";
import "./tile-lab.css";

export default function TileLabPage() {
  return (
    <main className="tile-page game-studio-page">
      <header className="tile-head game-studio-head">
        <div><p className="eyebrow">Pixel 03 · Atelier da Síntese</p><h1>Construa um mundo que continua além da borda.</h1></div>
        <div className="tile-head-actions"><PixelModeNav active="tile" /><Link className="secondary link-button" href="/">Sair do Studio</Link></div>
      </header>
      <div className="game-studio-body"><TileLab /></div>
    </main>
  );
}
