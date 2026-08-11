"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
  ["⌂", "Início", "/"],
  ["▤", "Aprender", "/learn"],
  ["─", "Gesto", "/gym"],
  ["◉", "Olhar", "/observation"],
  ["◇", "Estrutura", "/construction"],
  ["○", "Volume", "/form"],
  ["✎", "Atelier Livre", "/create"],
  ["⌖", "Atlas", "/journey"],
  ["✦", "Alpha", "/alpha"],
] as const;

const secondary = [
  ["C", "Codex Croma", "/codex"],
  ["□", "Meu progresso", "/skills"],
  ["↗", "Continuar", "/resume"],
] as const;

const STORAGE_KEY = "swd.sidebar.collapsed";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const gameWorkspace = pathname.startsWith("/create/manga") || pathname.startsWith("/create/isometric");
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== null) setCollapsed(saved === "true");
    } catch {}
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try { window.localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  };

  const navLinks = (items: readonly (readonly [string, string, string])[]) => items.map(([glyph, label, href]) => (
    <Link
      key={href}
      href={href}
      className={active(href) ? "is-active" : undefined}
      aria-current={active(href) ? "page" : undefined}
      title={collapsed || gameWorkspace ? label : undefined}
    >
      <span className="nav-glyph" aria-hidden="true">{glyph}</span>
      <b className="nav-label">{label}</b>
    </Link>
  ));

  const desktopMenuLabel = gameWorkspace
    ? mobileOpen ? "Fechar navegação" : "Abrir navegação"
    : collapsed ? "Expandir menu" : "Recolher menu";

  return (
    <div className={`app-shell app-shell-v12 ${collapsed ? "is-collapsed" : "is-expanded"} ${mobileOpen ? "is-mobile-open" : ""} ${gameWorkspace ? "is-game-workspace" : ""}`}>
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>

      <header className="global-header">
        <div className="global-header-left">
          <button
            className="shell-menu-button desktop-menu"
            type="button"
            onClick={gameWorkspace ? () => setMobileOpen((value) => !value) : toggleCollapsed}
            aria-label={desktopMenuLabel}
            aria-expanded={gameWorkspace ? mobileOpen : !collapsed}
          >
            <span aria-hidden="true">☰</span>
          </button>
          <button className="shell-menu-button mobile-menu" type="button" onClick={() => setMobileOpen((value) => !value)} aria-label="Abrir menu" aria-expanded={mobileOpen}>
            <span aria-hidden="true">☰</span>
          </button>
          <Link href="/" className="global-brand" aria-label="SimpleWay Drawing · Início">
            <span className="global-brand-mark" aria-hidden="true">S</span>
            <span><strong>SimpleWay</strong> <b>Drawing</b></span>
          </Link>
        </div>
        <div className="global-header-actions">
          <Link className="journey-streak" href="/codex"><span aria-hidden="true">C</span><span><strong>Croma</strong><small>Aprendiz do Olhar</small></span></Link>
          <Link className="header-notification" href="/feedback" aria-label="Feedback e notificações"><span aria-hidden="true">♢</span></Link>
          <Link className="header-profile" href="/resume"><span className="header-profile-mark">H</span><span><strong>HNK</strong><small>Perfil</small></span><b aria-hidden="true">⌄</b></Link>
        </div>
      </header>

      <aside className="collapsible-sidebar" aria-label="Navegação principal">
        <nav className="sidebar-nav">{navLinks(navigation)}</nav>
        <nav className="sidebar-nav sidebar-nav-secondary" aria-label="Progresso e Codex">{navLinks(secondary)}</nav>
        <div className="sidebar-bottom">
          <Link href="/diagnostics" title={collapsed || gameWorkspace ? "Configurações" : undefined}><span className="nav-glyph" aria-hidden="true">⚙</span><b className="nav-label">Configurações</b></Link>
        </div>
      </aside>

      {mobileOpen ? <button className="sidebar-scrim" type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} /> : null}

      <div className="app-stage-v12">
        <div id="main-content" tabIndex={-1}>{children}</div>
        <footer className="app-footer"><span>SimpleWay Drawing</span><span>Tehkné Solutions</span></footer>
      </div>
    </div>
  );
}
