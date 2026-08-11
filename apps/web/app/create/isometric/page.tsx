import Link from "next/link";
import { CromaCoach } from "../../components/croma-coach";
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
      <CromaCoach
        eyebrow="Missão de Croma · Estrutura 001"
        title="Construa primeiro. Decore depois."
        message="Use as três direções da grade para fechar um cubo. Depois desligue o snap e faça uma segunda tentativa por observação. O objetivo é compreender as direções antes do detalhe."
        actionLabel="Consultar o Codex"
        actionHref="/codex"
        tone="ultramarine"
      />
      <IsometricCanvas />
    </main>
  );
}
