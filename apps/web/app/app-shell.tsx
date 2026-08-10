import Link from "next/link";

const navigation = [
  ["⌂", "Home", "/"],
  ["◫", "Learn", "/learn"],
  ["⌁", "Gym", "/gym"],
  ["◉", "Observe", "/observation"],
  ["◇", "Construct", "/construction"],
  ["◯", "Form", "/form"],
  ["✎", "Create", "/create"],
  ["⌖", "Journey", "/journey"],
  ["✦", "Alpha", "/alpha"],
  ["□", "Feedback", "/feedback"],
  ["⌇", "Diagnostics", "/diagnostics"],
] as const;

const topNavigation = navigation.slice(0, 9);

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app-shell app-shell-v1">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <aside className="atelier-rail" aria-label="Navegação do atelier">
        <Link href="/" className="atelier-brand" aria-label="SimpleWay Drawing · Home">
          <span className="atelier-mark" aria-hidden="true">S</span>
          <span><strong>SimpleWay</strong><b>Drawing</b><small>Atelier de habilidades</small></span>
        </Link>
        <nav className="atelier-nav">
          {navigation.map(([glyph, label, href]) => (
            <Link key={href} href={href}><span aria-hidden="true">{glyph}</span><b>{label}</b></Link>
          ))}
        </nav>
        <blockquote className="atelier-quote">“A arte nunca se conclui; apenas se compreende um pouco mais.”<cite>— Leonardo da Vinci</cite></blockquote>
        <div className="atelier-signature"><strong>Tehkné Solutions</strong><span>Método. Arte. Propósito.</span></div>
      </aside>

      <div className="atelier-stage">
        <header className="app-header atelier-topbar">
          <nav className="app-nav atelier-topnav" aria-label="Navegação principal">
            {topNavigation.map(([, label, href]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
          <Link className="atelier-hnk" href="/resume">HNK <span aria-hidden="true">⌄</span></Link>
        </header>
        <div id="main-content" tabIndex={-1}>{children}</div>
        <footer className="app-footer"><span>SimpleWay Drawing</span><span>Tehkné Solutions</span></footer>
      </div>
    </div>
  );
}
