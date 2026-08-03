import Link from "next/link";

const navigation = [
  ["Home", "/"],
  ["Learn", "/learn"],
  ["Gym", "/gym"],
  ["Observe", "/observation"],
  ["Construct", "/construction"],
  ["Form", "/form"],
  ["Create", "/create"],
  ["Journey", "/journey"],
  ["Alpha", "/alpha"],
  ["Feedback", "/feedback"],
  ["Diagnostics", "/diagnostics"],
] as const;

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <header className="app-header">
        <Link href="/" className="app-brand" aria-label="SimpleWay Drawing · Home">
          <strong>SimpleWay</strong><span>Drawing</span>
        </Link>
        <nav className="app-nav" aria-label="Navegação principal">
          {navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
      </header>
      <div id="main-content" tabIndex={-1}>{children}</div>
      <footer className="app-footer"><span>SimpleWay Drawing</span><span>Tehkné Solutions</span></footer>
    </div>
  );
}
