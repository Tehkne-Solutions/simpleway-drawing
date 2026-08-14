import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtworkRepository } from "../../../server/runtime";
import { getSessionUserId } from "../../../server/session";
import "../review-intent-v123.css";
import { WorkChamberCanvas } from "./work-chamber-canvas";
import "./work-chamber-v19.css";

export default async function WorkChamberPage({ searchParams }: { searchParams: Promise<{ artworkId?: string }> }) {
  const { artworkId } = await searchParams;
  let initialArtwork: { id: string; title: string; notes: string; versionNumber: number; imageSrc: string } | undefined;

  if (artworkId) {
    const userId = await getSessionUserId();
    if (!userId) notFound();
    const record = await getArtworkRepository().getOwned(userId, artworkId);
    const current = record?.versions[0] ?? null;
    if (!record || !current || !current.mimeType.startsWith("image/")) notFound();
    initialArtwork = {
      id: record.artwork.id,
      title: record.artwork.title ?? "Sem título",
      notes: current.notes ?? "",
      versionNumber: current.versionNumber,
      imageSrc: `/api/artworks/${encodeURIComponent(record.artwork.id)}/current-image`,
    };
  }

  return (
    <main className="work-chamber-page game-studio-page">
      <header className="work-chamber-head game-studio-head">
        <div>
          <p className="eyebrow">Câmara da Obra · Atelier Autoral</p>
          <h1>{initialArtwork ? `Continue ${initialArtwork.title}.` : "Construa algo que não seja apenas um exercício."}</h1>
          <p>{initialArtwork ? `A versão ${initialArtwork.versionNumber} virou a base raster desta sessão. Uma decisão trazida da Mesa, quando existir nesta aba e pertencer a esta versão-base, é consumida localmente sem trafegar na URL.` : "Use construção e tinta como camadas de pensamento. O resultado é salvo como obra privada no mesmo arquivo e Atlas que preservam sua jornada."}</p>
        </div>
        <Link className="secondary link-button" href={initialArtwork ? `/create/${initialArtwork.id}` : "/create"}>{initialArtwork ? "Voltar à obra" : "Sair da Câmara"}</Link>
      </header>
      <div className="game-studio-body">
        <WorkChamberCanvas {...(initialArtwork ? { initialArtwork } : {})} />
      </div>
    </main>
  );
}
