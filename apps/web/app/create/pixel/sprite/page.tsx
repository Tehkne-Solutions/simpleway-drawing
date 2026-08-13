import Link from "next/link";
import { PixelModeNav } from "../pixel-mode-nav";
import { SpriteLab } from "./sprite-lab";
import "../pixel-mode-nav.css";
import "./sprite-v1.css";

export default function SpriteLabPage() {
  return (
    <main className="sprite-page game-studio-page">
      <header className="sprite-page-head game-studio-head">
        <div>
          <p className="eyebrow">Sprite 01 · Atelier da Síntese</p>
          <h1>Faça a forma viver antes de fazê-la andar.</h1>
        </div>
        <div className="sprite-head-actions">
          <PixelModeNav active="sprite" />
          <Link className="secondary link-button" href="/">Sair do Studio</Link>
        </div>
      </header>
      <div className="game-studio-body"><SpriteLab /></div>
    </main>
  );
}
