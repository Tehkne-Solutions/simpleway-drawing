import Link from "next/link";
import { getGymRepository } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";

export const dynamic = "force-dynamic";

const priorityLabel = {
  INTRODUCE: "Começar",
  DUE: "Revisar agora",
  DEVELOP: "Desenvolver",
  MAINTAIN: "Manter",
} as const;

export default async function SkillsPage() {
  const userId = await getSessionUserId();
  const plan = userId ? await getGymRepository().getPracticePlan(userId) : [];

  return (
    <main className="flow-shell">
      <section className="flow-card">
        <p className="eyebrow">Skill Profile</p>
        <h1 className="flow-title">Pratique o que mais move sua evolução agora.</h1>
        <p className="lead compact">O SimpleWay usa evidências reais, nível de domínio e revisão espaçada para decidir a próxima prática.</p>

        {!userId ? (
          <div className="practice-empty">
            <h2>Seu perfil começa com a primeira evidência.</h2>
            <p>Faça uma tentativa no Gym e o sistema passa a construir seu mapa de habilidade.</p>
            <Link href="/gym" className="primary link-button">Gerar minha primeira evidência</Link>
          </div>
        ) : (
          <div className="practice-queue">
            {plan.map((item) => (
              <article className="practice-card" key={item.skillKey}>
                <div className="practice-card-top">
                  <span className="practice-priority">{priorityLabel[item.priority]}</span>
                  <span>{item.evidenceCount} evidência(s)</span>
                </div>
                <h2>{item.title}</h2>
                <p>{item.reason}</p>
                <div className="practice-mastery">
                  <strong>{item.masteryScore == null ? "Novo" : `${Math.round(item.masteryScore * 100)}%`}</strong>
                  <span>{item.masteryLevel ?? "Ainda não introduzida"}</span>
                </div>
                <div className="flow-actions split-actions">
                  <span>{item.nextReviewAt ? `Próxima revisão: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.nextReviewAt)}` : "Disponível agora"}</span>
                  <Link href={item.href} className="primary link-button">Praticar agora</Link>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="flow-actions"><Link href="/" className="secondary link-button">Voltar ao início</Link></div>
      </section>
    </main>
  );
}
