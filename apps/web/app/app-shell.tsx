"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  ["⌂", "Início", "/"],
  ["▤", "Aprender", "/learn"],
  ["─", "Treinar", "/gym"],
  ["◉", "Observar", "/observation"],
  ["◇", "Construir", "/construction"],
  ["○", "Formas", "/form"],
  ["✎", "Criar", "/create"],
  ["⌖", "Jornada", "/journey"],
  ["✦", "Alpha", "/alpha"],
] as const;

const secondary = [
  ["□", "Meu progresso", "/skills"],
  ["↗", "Continuar", "/resume"],
] as const;

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="app-shell app-shell-v1 app-shell-v11">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <aside className="atelier-rail" aria-label="Navegação do atelier">
        <Link href="/" className="atelier-brand" aria-label="SimpleWay Drawing · Início">
          <span className="atelier-mark" aria-hidden="true">S</span>
          <span><strong>SimpleWay</strong><b>Drawing</b><small>Atelier de habilidades</small></span>
        </Link>
        <nav className="atelier-nav">
          {navigation.map(([glyph, label, href]) => (
            <Link key={href} href={href} className={active(href) ? "is-active" : undefined} aria-current={active(href) ? "page" : undefined}>
              <span aria-hidden="true">{glyph}</span><b>{label}</b>
            </Link>
          ))}
        </nav>
        <nav className="atelier-nav atelier-nav-secondary" aria-label="Progresso">
          {secondary.map(([glyph, label, href]) => (
            <Link key={href} href={href} className={active(href) ? "is-active" : undefined}>
              <span aria-hidden="true">{glyph}</span><b>{label}</b>
            </Link>
          ))}
        </nav>
        <Link className="atelier-profile" href="/resume">
          <span className="atelier-profile-mark">H</span>
          <span><strong>HNK</strong><small>Minha jornada</small></span>
          <b aria-hidden="true">›</b>
        </Link>
        <div className="atelier-signature"><strong>Tehkné Solutions</strong><span>Método. Arte. Propósito.</span></div>
      </aside>

      <div className="atelier-stage">
        <header className="app-header atelier-topbar">
          <Link className="atelier-context" href="/">SimpleWay Drawing</Link>
          <div className="atelier-topbar-actions">
            <Link href="/resume">Continuar jornada</Link>
            <Link className="atelier-hnk" href="/resume">HNK <span aria-hidden="true">⌄</span></Link>
          </div>
        </header>
        <div id="main-content" tabIndex={-1}>{children}</div>
        <footer className="app-footer"><span>SimpleWay Drawing</span><span>Tehkné Solutions</span></footer>
      </div>
    </div>
  );
}
