import Link from "next/link";
import { WorkChamberCanvas } from "./work-chamber-canvas";
import "./work-chamber-v19.css";

export default function WorkChamberPage() {
  return (
    <main className="work-chamber-page game-studio-page">
      <header className="work-chamber-head game-studio-head">
        <div>
          <p className="eyebrow">Câmara da Obra · Atelier Autoral</p>
          <h1>Construa algo que não seja apenas um exercício.</h1>
          <p>Use construção e tinta como camadas de pensamento. O resultado é salvo como obra privada no mesmo arquivo e Atlas que preservam sua jornada.</p>
        </div>
        <Link className="secondary link-button" href="/create">Sair da Câmara</Link>
      </header>
      <div className="game-studio-body">
        <WorkChamberCanvas />
      </div>
    </main>
  );
}
