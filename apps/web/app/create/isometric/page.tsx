import Link from "next/link";
import { CROMA_CANON } from "../../../game/croma-canon";
import { IsometricCanvas } from "./isometric-canvas";
import "./isometric-v13.css";

export default function IsometricPracticePage() {
  return (
    <main className="iso-page">
      <header className="iso-page-head">
        <div>
          <p className="eyebrow">Atelier da Estrutura · Canvas Isométrico</p>
          <h1>Desenhe espaço em duas dimensões.</h1>
          <p>Treine construção 3D usando uma grade isométrica, snap opcional, segmentos estruturais e traço livre. Seu estudo fica salvo localmente neste dispositivo.</p>
        </div>
        <Link className="secondary link-button" href="/create">Voltar ao Atelier Livre</Link>
      </header>
      <div className="croma-challenge">
        <div className="croma-seal" aria-hidden="true">C</div>
        <div><h3>{CROMA_CANON.shortName} abriu uma missão de construção.</h3><p>{CROMA_CANON.mottoPt} O objetivo é compreender as direções antes de detalhar.</p></div>
        <Link className="secondary link-button" href="/codex">Abrir Codex</Link>
      </div>
      <IsometricCanvas />
    </main>
  );
}
