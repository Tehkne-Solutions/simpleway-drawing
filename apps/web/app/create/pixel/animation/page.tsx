import Link from "next/link";
import { PixelModeNav } from "../pixel-mode-nav";
import { AnimationLab } from "./animation-lab";
import "./animation-lab.css";

export default function AnimationLabPage() {
  return (
    <main className="animation-page game-studio-page">
      <header className="animation-head game-studio-head">
        <div><p className="eyebrow">Pixel 04 · Atelier da Síntese</p><h1>Desenhe o tempo entre uma pose e outra.</h1></div>
        <div className="animation-head-actions"><PixelModeNav active="animation" /><Link className="secondary link-button" href="/">Sair do Studio</Link></div>
      </header>
      <div className="game-studio-body"><AnimationLab /></div>
    </main>
  );
}
