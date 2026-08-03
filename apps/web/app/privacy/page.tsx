import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <main className="flow-shell">
      <section className="flow-card" style={{ maxWidth: 820, margin: "32px auto" }}>
        <p className="eyebrow">SimpleWay Drawing · Closed Alpha</p>
        <h1 className="flow-title">Privacidade e dados do participante</h1>
        <p className="lead compact">O Closed Alpha coleta apenas os dados necessários para ensinar, salvar seu progresso, operar o teste e entender onde a experiência precisa melhorar.</p>

        <section className="card" style={{ minHeight: 0, marginTop: 24 }}>
          <h2>O que registramos</h2>
          <p>Perfil de aprendizagem e preferências escolhidas no onboarding; progresso em lições e ciclos; tentativas, Evidence e estado de mastery; artworks e arquivos que você decidir enviar; atividade mínima de sessão/etapa para retomada e suporte; feedback enviado voluntariamente.</p>
        </section>

        <section className="card" style={{ minHeight: 0, marginTop: 14 }}>
          <h2>O que o painel operacional não mostra</h2>
          <p>O Control Center não exibe o conteúdo dos seus desenhos, arquivos enviados ou metadata bruta do dispositivo. A equipe vê apenas sinais necessários para suporte, como etapa atual, última atividade, cohort e contagens agregadas.</p>
        </section>

        <section className="card" style={{ minHeight: 0, marginTop: 14 }}>
          <h2>Como os dados são usados</h2>
          <p>Para entregar o método de aprendizagem, permitir retomada da jornada, avaliar o funcionamento pedagógico, diagnosticar problemas do Alpha e melhorar o produto. Os dados do Closed Alpha não são usados para vender publicidade comportamental.</p>
        </section>

        <section className="card" style={{ minHeight: 0, marginTop: 14 }}>
          <h2>Seu export</h2>
          <p>Quando estiver com sua sessão do Alpha aberta, você pode baixar um resumo JSON dos dados associados à sua conta de teste.</p>
          <a className="primary" href="/api/privacy/export" style={{ display: "inline-flex", marginTop: 10 }}>Exportar meus dados</a>
        </section>

        <section className="card" style={{ minHeight: 0, marginTop: 14 }}>
          <h2>Sobre exclusão</h2>
          <p>Antes da abertura pública, a exclusão será disponibilizada de forma segura e auditável. Durante o Closed Alpha, solicitações de remoção devem ser tratadas pela equipe responsável pelo teste para evitar exclusões acidentais enquanto o fluxo de identidade ainda é temporário.</p>
        </section>

        <div style={{ marginTop: 24 }}><Link className="secondary" href="/">Voltar ao SimpleWay Drawing</Link></div>
        <p style={{ marginTop: 20, opacity: .7, fontSize: 13 }}>Closed Alpha privacy notice · Tehkné Solutions</p>
      </section>
    </main>
  );
}
