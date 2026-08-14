"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type MissionId = "pixel" | "sprite" | "tile" | "animation";
type Progress = Record<MissionId, boolean>;
type Pixel = string | null;
type SyncStatus = "local" | "syncing" | "synced" | "offline";
type ServerSnapshot = { completedMissionIds: MissionId[]; completedCount: number; xp: number; complete: boolean };

const missions = [
  { id: "pixel" as const, number: "01", title: "Olho de Croma", discipline: "Forma", reward: "Sigilo da Forma", glyph: "▦", href: "/create/pixel", brief: "Sintetize uma forma legível em 16×16 usando poucos clusters e poucas cores." },
  { id: "sprite" as const, number: "02", title: "Pulso de Croma", discipline: "Movimento", reward: "Sigilo do Movimento", glyph: "◫", href: "/create/pixel/sprite", brief: "Construa poses distintas e confirme a leitura com onion skin e playback." },
  { id: "tile" as const, number: "03", title: "Tessela de Croma", discipline: "Continuidade", reward: "Sigilo da Continuidade", glyph: "⌗", href: "/create/pixel/tile", brief: "Faça a borda desaparecer em um padrão repetível e audite suas costuras." },
  { id: "animation" as const, number: "04", title: "Ritmo de Croma", discipline: "Tempo", reward: "Sigilo do Ritmo", glyph: "▶", href: "/create/pixel/animation", brief: "Use duração por frame para desenhar aceleração, pausa e intenção temporal." },
] as const;

const emptyProgress: Progress = { pixel: false, sprite: false, tile: false, animation: false };

function parse(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" ? value as Record<string, unknown> : null;
  } catch { return null; }
}

function strings(values: unknown[]): string[] {
  return values.filter((value): value is string => typeof value === "string" && value.length > 0);
}

function pixelMissionComplete(): boolean {
  const saved = parse(localStorage.getItem("swd.create.pixel.v1.16"));
  const pixels = saved?.pixels;
  if (!Array.isArray(pixels) || pixels.length !== 256) return false;
  const colors = new Set<string>();
  let painted = 0, minX = 16, maxX = -1, minY = 16, maxY = -1;
  pixels.forEach((value, index) => {
    if (typeof value !== "string" || !value) return;
    painted += 1; colors.add(value);
    const x = index % 16, y = Math.floor(index / 16);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  });
  const width = painted ? maxX - minX + 1 : 0;
  const height = painted ? maxY - minY + 1 : 0;
  return painted >= 32 && colors.size >= 2 && colors.size <= 5 && width >= 7 && height >= 5;
}

function spriteSavedComplete(saved: Record<string, unknown> | null): boolean {
  const frames = saved?.frames;
  if (!Array.isArray(frames) || frames.length < 4 || frames.length > 8) return false;
  const valid = frames.filter((item): item is unknown[] => Array.isArray(item));
  if (valid.length !== frames.length) return false;
  const nonEmpty = valid.filter((item) => strings(item).length > 0);
  const distinct = new Set(nonEmpty.map((item) => item.map((value) => typeof value === "string" ? value : "_").join("|"))).size;
  const colors = new Set(valid.flatMap((item) => strings(item)));
  return nonEmpty.length >= 3 && distinct >= 3 && colors.size >= 2 && colors.size <= 5 && saved?.onionUsed === true && saved?.previewPlayed === true;
}

function spriteMissionComplete(): boolean {
  return [16, 32].some((resolution) => spriteSavedComplete(parse(localStorage.getItem(`swd.create.pixel.sprite.v1.${resolution}`))));
}

function tileSavedComplete(saved: Record<string, unknown> | null, resolution: number): boolean {
  const pixels = saved?.pixels;
  if (!Array.isArray(pixels) || pixels.length !== resolution * resolution) return false;
  const painted = pixels.filter((value) => typeof value === "string" && value.length > 0).length;
  const colors = new Set(strings(pixels));
  const filled = (x: number, y: number) => typeof pixels[y * resolution + x] === "string" && Boolean(pixels[y * resolution + x]);
  const edges = [
    Array.from({ length: resolution }, (_, x) => filled(x, 0)).some(Boolean),
    Array.from({ length: resolution }, (_, x) => filled(x, resolution - 1)).some(Boolean),
    Array.from({ length: resolution }, (_, y) => filled(0, y)).some(Boolean),
    Array.from({ length: resolution }, (_, y) => filled(resolution - 1, y)).some(Boolean),
  ].filter(Boolean).length;
  const coverage = painted / pixels.length;
  return coverage >= .12 && coverage <= .82 && colors.size >= 2 && colors.size <= 6 && edges >= 3 && Number(saved?.previewChecks ?? 0) > 0 && Number(saved?.offsetChecks ?? 0) > 0;
}

function tileMissionComplete(): boolean {
  return [8, 16, 32].some((resolution) => tileSavedComplete(parse(localStorage.getItem(`swd.create.pixel.tile.v1.${resolution}`)), resolution));
}

function animationSavedComplete(saved: Record<string, unknown> | null): boolean {
  const frames = saved?.frames;
  if (!Array.isArray(frames) || frames.length < 4 || frames.length > 8) return false;
  const pixelFrames = frames.map((item) => {
    if (!item || typeof item !== "object") return [] as Pixel[];
    const pixels = (item as Record<string, unknown>).pixels;
    return Array.isArray(pixels) ? pixels.map((value) => typeof value === "string" ? value : null) : [];
  });
  const distinct = new Set(pixelFrames.map((item) => item.map((value) => value ?? "_").join("|"))).size;
  const colors = new Set(pixelFrames.flatMap((item) => item.filter((value): value is string => Boolean(value))));
  return distinct >= 3 && colors.size >= 2 && saved?.timingUsed === true && saved?.onionUsed === true && saved?.playUsed === true;
}

function animationMissionComplete(): boolean {
  return animationSavedComplete(parse(localStorage.getItem("swd.pixel.animation.v1")));
}

function readLocalProgress(): Progress {
  return {
    pixel: pixelMissionComplete(),
    sprite: spriteMissionComplete(),
    tile: tileMissionComplete(),
    animation: animationMissionComplete(),
  };
}

function progressFromServer(ids: MissionId[]): Progress {
  const set = new Set(ids);
  return { pixel: set.has("pixel"), sprite: set.has("sprite"), tile: set.has("tile"), animation: set.has("animation") };
}

function mergeProgress(a: Progress, b: Progress): Progress {
  return { pixel: a.pixel || b.pixel, sprite: a.sprite || b.sprite, tile: a.tile || b.tile, animation: a.animation || b.animation };
}

function localSubmission(missionId: MissionId): { missionId: MissionId; payload: Record<string, unknown> } | null {
  if (missionId === "pixel") {
    const saved = parse(localStorage.getItem("swd.create.pixel.v1.16"));
    if (!pixelMissionComplete() || !Array.isArray(saved?.pixels)) return null;
    return { missionId, payload: { resolution: 16, pixels: saved.pixels } };
  }
  if (missionId === "sprite") {
    for (const resolution of [16, 32]) {
      const saved = parse(localStorage.getItem(`swd.create.pixel.sprite.v1.${resolution}`));
      if (!spriteSavedComplete(saved) || !Array.isArray(saved?.frames)) continue;
      return { missionId, payload: { resolution, frames: saved.frames, onionUsed: saved.onionUsed, previewPlayed: saved.previewPlayed } };
    }
    return null;
  }
  if (missionId === "tile") {
    for (const resolution of [8, 16, 32]) {
      const saved = parse(localStorage.getItem(`swd.create.pixel.tile.v1.${resolution}`));
      if (!tileSavedComplete(saved, resolution) || !Array.isArray(saved?.pixels)) continue;
      return { missionId, payload: { resolution, pixels: saved.pixels, previewChecks: saved.previewChecks, offsetChecks: saved.offsetChecks } };
    }
    return null;
  }
  const saved = parse(localStorage.getItem("swd.pixel.animation.v1"));
  if (!animationSavedComplete(saved) || !Array.isArray(saved?.frames)) return null;
  return { missionId, payload: { frames: saved.frames, timingUsed: saved.timingUsed, onionUsed: saved.onionUsed, playUsed: saved.playUsed } };
}

function snapshotPayload(value: unknown): ServerSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.completedMissionIds)) return null;
  const ids = record.completedMissionIds.filter((item): item is MissionId => item === "pixel" || item === "sprite" || item === "tile" || item === "animation");
  return { completedMissionIds: ids, completedCount: Number(record.completedCount ?? ids.length), xp: Number(record.xp ?? ids.length * 125), complete: record.complete === true };
}

export function PixelQuestBoard() {
  const [localProgress, setLocalProgress] = useState<Progress>(emptyProgress);
  const [serverProgress, setServerProgress] = useState<Progress>(emptyProgress);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const syncingRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    const sync = async (local: Progress) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      if (!disposed) setSyncStatus("syncing");
      try {
        const session = await fetch("/api/session/guest", { method: "POST" });
        if (!session.ok) throw new Error("SESSION_UNAVAILABLE");
        let response = await fetch("/api/pixel/expedition", { cache: "no-store" });
        if (!response.ok) throw new Error("PIXEL_EXPEDITION_UNAVAILABLE");
        let snapshot = snapshotPayload(await response.json());
        if (!snapshot) throw new Error("INVALID_PIXEL_EXPEDITION_SNAPSHOT");
        const serverIds = new Set(snapshot.completedMissionIds);
        for (const mission of missions) {
          if (!local[mission.id] || serverIds.has(mission.id)) continue;
          const submission = localSubmission(mission.id);
          if (!submission) continue;
          response = await fetch("/api/pixel/expedition", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(submission),
          });
          if (!response.ok) continue;
          const result = await response.json() as { snapshot?: unknown };
          const next = snapshotPayload(result.snapshot);
          if (next) {
            snapshot = next;
            serverIds.clear();
            next.completedMissionIds.forEach((id) => serverIds.add(id));
          }
        }
        if (!disposed) {
          setServerProgress(progressFromServer(snapshot.completedMissionIds));
          setSyncStatus("synced");
        }
      } catch {
        if (!disposed) setSyncStatus("offline");
      } finally {
        syncingRef.current = false;
      }
    };

    const refresh = () => {
      const local = readLocalProgress();
      setLocalProgress(local);
      void sync(local);
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const progress = mergeProgress(localProgress, serverProgress);
  const completed = missions.filter((mission) => progress[mission.id]).length;
  const nextIndex = missions.findIndex((mission) => !progress[mission.id]);
  const xp = completed * 125;
  const complete = completed === missions.length;
  const nextMission = nextIndex >= 0 ? missions[nextIndex] : null;
  const percent = Math.round((completed / missions.length) * 100);
  const status = useMemo(() => complete ? "Síntese Dominada" : completed >= 2 ? "Cartógrafo do Pixel" : completed >= 1 ? "Aprendiz da Síntese" : "Iniciado da Síntese", [complete, completed]);
  const syncCopy = syncStatus === "synced"
    ? "Evidence sincronizada com o Atlas."
    : syncStatus === "syncing"
      ? "Validando Evidence com a Sociedade Croma…"
      : syncStatus === "offline"
        ? "Progresso local ativo; o Atlas será sincronizado quando o runtime estiver disponível."
        : "Lendo os estudos salvos neste dispositivo.";

  return <section className="synthesis-quest-board">
    <aside className="quest-dossier">
      <div className="quest-seal" aria-hidden="true">C</div>
      <p className="eyebrow">Croma · Ordem da Síntese</p>
      <h2>Quatro leis. Um só olhar.</h2>
      <p>Forma, movimento, continuidade e tempo são quatro maneiras de decidir o que um pixel precisa fazer. Complete as oficinas para formar o Emblema da Síntese.</p>
      <div className="quest-rank"><span>TÍTULO ATUAL</span><strong>{status}</strong><small>{xp}/500 XP da Expedição</small></div>
      <div className="quest-progress" aria-label={`${percent}% da expedição concluída`}><i style={{ width: `${percent}%` }} /></div>
      <small className={`quest-device-note sync-${syncStatus}`}>{syncCopy}</small>
      {syncStatus === "synced" && completed > 0 ? <Link className="quest-atlas-link" href="/journey">Ver Evidence no Atlas →</Link> : null}
    </aside>

    <div className="quest-map" aria-label="Mapa da Expedição da Síntese">
      <div className="quest-map-mark" aria-hidden="true">SYNTHESIS · IV</div>
      {missions.map((mission, index) => {
        const done = progress[mission.id];
        const serverDone = serverProgress[mission.id];
        const current = !complete && index === nextIndex;
        return <article key={mission.id} className={`quest-node quest-node-${index + 1} ${done ? "is-complete" : ""} ${current ? "is-current" : ""}`}>
          <div className="quest-node-top"><span>{mission.number} · {mission.discipline}</span><b>{serverDone ? "EVIDENCE ✓" : done ? "CONCLUÍDA" : current ? "MISSÃO ATIVA" : "EXPLORÁVEL"}</b></div>
          <div className="quest-node-core"><span className="quest-node-glyph" aria-hidden="true">{done ? "✓" : mission.glyph}</span><div><strong>{mission.title}</strong><p>{mission.brief}</p></div></div>
          <div className="quest-node-reward"><span>RECOMPENSA</span><b>{mission.reward}</b></div>
          <Link href={mission.href}>{done ? "Revisitar oficina" : current ? "Entrar na missão" : "Explorar oficina"} →</Link>
        </article>;
      })}
      <span className="quest-route route-a" aria-hidden="true" /><span className="quest-route route-b" aria-hidden="true" /><span className="quest-route route-c" aria-hidden="true" />
    </div>

    <aside className={`quest-reward-vault ${complete ? "is-complete" : ""}`}>
      <p className="eyebrow">Cofre de Croma</p>
      <div className="quest-emblem" aria-hidden="true"><span>▦</span><span>◫</span><span>⌗</span><span>▶</span></div>
      <h2>{complete ? "Emblema da Síntese formado." : `${completed}/4 sigilos recuperados.`}</h2>
      <div className="quest-sigils">{missions.map((mission) => <div key={mission.id} className={progress[mission.id] ? "is-earned" : ""}><b>{progress[mission.id] ? "◆" : "◇"}</b><span>{mission.reward}</span></div>)}</div>
      {nextMission ? <div className="quest-next"><span>PRÓXIMA MISSÃO</span><strong>{nextMission.title}</strong><p>{nextMission.brief}</p><Link href={nextMission.href}>Jogar agora →</Link></div> : <div className="quest-next final"><span>PROVA LIVRE</span><strong>Agora quebre as quatro regras de propósito.</strong><p>Crie uma peça própria escolhendo conscientemente onde simplificar, repetir, mover e pausar.</p><Link href="/create/pixel">Abrir Pixel Studio →</Link></div>}
    </aside>
  </section>;
}
