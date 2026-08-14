import Link from "next/link";
import { PixelModeNav } from "../pixel-mode-nav";
import { PixelQuestBoard } from "./pixel-quest-board";
import "../pixel-mode-nav.css";
import "./quest-v1.css";

export default function PixelQuestPage() {
  return <main className="game-studio-page synthesis-quest-page">
    <header className="game-studio-head synthesis-quest-head">
      <div><p className="eyebrow">Campanha · Atelier da Síntese</p><h1>Expedição da Síntese</h1></div>
      <div className="sprite-head-actions"><PixelModeNav active="quest" /><Link className="secondary link-button" href="/create">Sair para o Atelier</Link></div>
    </header>
    <div className="game-studio-body"><PixelQuestBoard /></div>
  </main>;
}
