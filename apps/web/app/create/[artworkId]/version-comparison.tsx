"use client";

import { useMemo, useState } from "react";

type VersionForComparison = {
  id: string;
  versionNumber: number;
  readUrl: string;
  source: string;
  notes: string | null;
  createdAt: string;
};

const sourceLabel: Record<string, string> = { CANVAS: "Câmara", UPLOAD: "Upload", PHOTO: "Foto" };

export function VersionComparison({ versions, artworkTitle }: { versions: VersionForComparison[]; artworkTitle: string }) {
  const current = versions[0] ?? null;
  const historical = versions.slice(1);
  const [selectedVersion, setSelectedVersion] = useState(historical[0]?.versionNumber ?? current?.versionNumber ?? 1);
  const [reveal, setReveal] = useState(50);
  const selected = useMemo(() => historical.find((version) => version.versionNumber === selectedVersion) ?? historical[0] ?? current, [current, historical, selectedVersion]);

  if (!current || !selected || versions.length < 2) return null;

  const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

  return (
    <section className="version-comparison" aria-labelledby="version-comparison-title">
      <header className="version-comparison-head">
        <div>
          <p className="eyebrow">Mesa de Comparação</p>
          <h2 id="version-comparison-title">Veja a mudança antes de decidir o próximo gesto.</h2>
          <p>Compare uma versão preservada com a versão atual. O sistema não inventa uma nota sobre sua arte: ele coloca as evidências lado a lado para você observar o que realmente mudou.</p>
        </div>
        <label className="version-compare-select">Versão de referência
          <select value={selected.versionNumber} onChange={(event) => { setSelectedVersion(Number(event.target.value)); setReveal(50); }}>
            {historical.map((version) => <option key={version.id} value={version.versionNumber}>V{version.versionNumber} · {sourceLabel[version.source] ?? version.source}</option>)}
          </select>
        </label>
      </header>

      <div className="version-compare-grid">
        <article className="version-compare-card is-reference">
          <div className="version-compare-image"><img src={selected.readUrl} alt={`${artworkTitle} · versão ${selected.versionNumber}`} /></div>
          <div className="version-compare-meta"><span>REFERÊNCIA · V{selected.versionNumber}</span><strong>{sourceLabel[selected.source] ?? selected.source}</strong><small>{formatDate(selected.createdAt)}</small><p>{selected.notes || "Sem nota de processo nesta versão."}</p></div>
        </article>
        <article className="version-compare-card is-current">
          <div className="version-compare-image"><img src={current.readUrl} alt={`${artworkTitle} · versão atual ${current.versionNumber}`} /></div>
          <div className="version-compare-meta"><span>ATUAL · V{current.versionNumber}</span><strong>{sourceLabel[current.source] ?? current.source}</strong><small>{formatDate(current.createdAt)}</small><p>{current.notes || "Sem nota de processo nesta versão."}</p></div>
        </article>
      </div>

      <div className="version-wipe-station">
        <div className="version-wipe-copy"><span>RÉGUA DE SOBREPOSIÇÃO</span><strong>Arraste para comparar a mesma área visual.</strong><small>{100 - reveal}% V{selected.versionNumber} · {reveal}% V{current.versionNumber}</small></div>
        <div className="version-wipe-canvas" style={{ "--compare-reveal": `${reveal}%` } as React.CSSProperties}>
          <img className="version-wipe-base" src={selected.readUrl} alt={`Base V${selected.versionNumber}`} />
          <div className="version-wipe-current"><img src={current.readUrl} alt={`Sobreposição V${current.versionNumber}`} /></div>
          <div className="version-wipe-divider" aria-hidden="true"><i /></div>
        </div>
        <label className="version-wipe-range">Comparação visual
          <input type="range" min={0} max={100} value={reveal} onChange={(event) => setReveal(Number(event.target.value))} aria-valuetext={`${reveal}% da versão atual visível`} />
        </label>
      </div>

      <aside className="version-compare-prompt">
        <span>CROMA · LEITURA SEM PONTUAÇÃO</span>
        <strong>Antes de criar V{current.versionNumber + 1}, escolha conscientemente:</strong>
        <div><p><b>Preservar</b> uma decisão que ficou mais clara na versão atual.</p><p><b>Transformar</b> uma decisão que ainda não serve à intenção da obra.</p></div>
      </aside>
    </section>
  );
}
