import Link from "next/link";
import { CROMA_CANON, SWD_ATELIERS } from "../../game/croma-canon";
import { CromaMark, type CromaPigment, type CromaState } from "../components/croma-mark";
import "./codex-v13.css";

const cromaStates: Array<{ state: CromaState; pigment: CromaPigment; title: string; role: string }> = [
  { state: "observe", pigment: "gold", title: "Observando", role: "Croma desacelera a resposta e pede que você veja relações antes de tocar no canvas." },
  { state: "focus", pigment: "violet", title: "Concentrado", role: "Croma reduz o ruído e mantém a atenção em uma única variável visual por vez." },
  { state: "curious", pigment: "ultramarine", title: "Curioso", role: "Croma transforma estranheza em pergunta e incentiva investigação em vez de resposta pronta." },
  { state: "teach", pigment: "veronese", title: "Ensinando", role: "Croma demonstra uma ferramenta, uma regra visual ou um jeito de testar uma hipótese." },
  { state: "challenge", pigment: "terracotta", title: "Alerta / Desafio", role: "Croma transforma a habilidade em problema jogável: uma prova curta, clara e verificável." },
  { state: "correct", pigment: "veronese", title: "Ajuste", role: "Croma aponta incoerências e sugere outra tentativa sem transformar erro em punição." },
  { state: "celebrate", pigment: "gold", title: "Celebração", role: "Croma reconhece Evidence real, território consagrado e mudança observável de processo." },
  { state: "guide", pigment: "ultramarine", title: "Bússola", role: "Croma conecta o que você já demonstrou ao próximo território mais útil da jornada." },
];

export default function CodexPage() {
  return (
    <main className="codex-page">
      <header className="codex-hero">
        <div className="codex-hero-croma"><CromaMark state="curious" pigment="terracotta" variant="sketch" label="Croma Sketch no caderno da Sociedade Croma" /></div>
        <div>
          <p className="eyebrow">{CROMA_CANON.codex} · Registro 001 · Croma Sketch</p>
          <h1>{CROMA_CANON.name}</h1>
          <p className="codex-subtitle">{CROMA_CANON.title} · {CROMA_CANON.lineage}</p>
          <blockquote>{CROMA_CANON.motto} <span>{CROMA_CANON.mottoPt}</span></blockquote>
        </div>
      </header>

      <section className="codex-sheet codex-story">
        <p className="codex-note">{CROMA_CANON.note}</p>
        <h2>A lenda dos Camaleões do Olhar</h2>
        <p>Segundo a tradição da Sociedade Croma, um camaleão chamado <strong>Cromatico</strong> teria vivido entre instrumentos, papéis e estudos de um atelier renascentista ligado à figura de Leonardo da Vinci. Em vez de copiar desenhos, ele teria aprendido algo mais raro: observar como um mestre observa.</p>
        <p>Seus descendentes preservaram esse princípio por gerações. A linhagem ficou conhecida como <strong>Camaleões do Olhar</strong>: artistas e investigadores cuja habilidade verdadeira não é mudar de cor, mas perceber relações que outros ainda não aprenderam a enxergar.</p>
        <p><strong>Croma di Vinci</strong> é um herdeiro contemporâneo dessa tradição. Ele não aparece como mestre perfeito. Aprende junto com o jogador, abre missões, provoca novas tentativas e registra descobertas no Codex.</p>
      </section>

      <section className="codex-sheet" aria-labelledby="croma-expression-title">
        <p className="eyebrow">Croma Vivo · Expression Pack</p>
        <h2 id="croma-expression-title">A expressão diz o que ele está fazendo por você.</h2>
        <p>Croma mantém a mesma silhueta e identidade, mas muda olhar, boca, postura do pincel, sinais gráficos e pigmento conforme sua função. Assim, até uma criança que ainda lê pouco consegue perceber se é hora de observar, concentrar, investigar, aprender, tentar, ajustar, comemorar ou seguir uma rota.</p>
        <div className="croma-expression-atlas">
          {cromaStates.map((item) => (
            <article className="croma-expression-card" key={item.state} data-croma-state={item.state} data-croma-pigment={item.pigment}>
              <CromaMark state={item.state} pigment={item.pigment} label={`Croma em estado ${item.title}`} />
              <strong>{item.title}</strong>
              <span>{item.role}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="codex-sheet">
        <div className="section-heading"><div><p className="eyebrow">Sociedade Croma</p><h2>Os Ateliers</h2></div><Link className="secondary link-button" href="/journey">Abrir Atlas do Olhar</Link></div>
        <div className="codex-ateliers">
          {SWD_ATELIERS.map((atelier, index) => (
            <Link key={atelier.key} href={atelier.href} className={`codex-atelier pigment-${atelier.pigment}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{atelier.name}</strong>
              <p>{atelier.purpose}</p>
              <b aria-hidden="true">→</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="codex-sheet codex-player-oath">
        <p className="eyebrow">Título inicial</p>
        <h2>{CROMA_CANON.playerTitle}</h2>
        <p>O jogador começa sem a obrigação de “ter talento”. Seu primeiro compromisso é observar, tentar, comparar e corrigir. Evidências reais de prática — e não tempo de tela — constroem sua jornada.</p>
        <div className="flow-actions"><Link className="primary link-button" href="/create/isometric">Jogar a primeira missão de Croma</Link><Link className="secondary link-button" href="/learn">Entrar no currículo</Link></div>
      </section>
    </main>
  );
}
