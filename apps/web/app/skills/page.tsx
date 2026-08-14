import { learnerSkillStates } from "@swd/database";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { getDatabase, getGymRepository } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";

export const dynamic = "force-dynamic";

const priorityLabel = {
  INTRODUCE: "Começar",
  DUE: "Revisar agora",
  DEVELOP: "Desenvolver",
  MAINTAIN: "Manter",
} as const;

const skillLabel: Record<string, string> = {
  "skill.drawing.perception.proportion": "Proporção visual",
  "skill.drawing.perception.angle": "Leitura de ângulo",
  "skill.drawing.perception.alignment": "Alinhamento visual",
  "skill.drawing.perception.negative_space": "Espaço negativo",
  "skill.drawing.shape.decomposition": "Decomposição estrutural",
  "skill.drawing.shape.envelope": "Envelope",
  "skill.drawing.shape.silhouette": "Leitura de silhueta",
  "skill.drawing.shape.overlap": "Lógica de sobreposição",
  "skill.drawing.form.box": "Construção de caixas",
  "skill.drawing.form.cylinder": "Construção de cilindros",
  "skill.drawing.form.ellipse_space": "Elipses no espaço",
  "skill.drawing.form.cross_contour": "Cross-contour",
  "skill.drawing.spatial.mental_rotation": "Rotação mental",
  "skill.drawing.creative.pixel_synthesis": "Síntese em Pixel Art",
  "skill.drawing.creative.sprite_motion": "Movimento por poses",
  "skill.drawing.creative.pattern_continuity": "Continuidade de padrões",
  "skill.drawing.creative.animation_timing": "Timing de animação",
  "skill.drawing.creative.manga_head_construction": "Construção de cabeça em múltiplas vistas",
  "skill.drawing.creative.isometric_construction": "Construção isométrica em três eixos",
};

export default async function SkillsPage() {
  const userId = await getSessionUserId();
  const plan = userId ? await getGymRepository().getPracticePlan(userId) : [];
  const allStates = userId
    ? await getDatabase().select({
        skillKey: learnerSkillStates.skillKey,
        masteryScore: learnerSkillStates.masteryScore,
        masteryLevel: learnerSkillStates.masteryLevel,
        evidenceCount: learnerSkillStates.evidenceCount,
        lastPracticedAt: learnerSkillStates.lastPracticedAt,
      }).from(learnerSkillStates).where(eq(learnerSkillStates.userId, userId))
    : [];
  const gymSkills = new Set(plan.map((item) => item.skillKey));
  const labStates = allStates.filter((state) => !gymSkills.has(state.skillKey));

  return (
    <main className="flow-shell">
      <section className="flow-card">
        <p className="eyebrow">Skill Profile</p>
        <h1 className="flow-title">Pratique o que mais move sua evolução agora.</h1>
        <p className="lead compact">O SimpleWay usa evidências reais, nível de domínio e revisão espaçada para decidir a próxima prática.</p>

        {!userId ? (
          <div className="practice-empty">
            <h2>Seu perfil começa com a primeira evidência.</h2>
            <p>Faça uma tentativa no Gym ou conclua uma missão em um Atelier e o sistema passa a construir seu mapa de habilidade.</p>
            <Link href="/create" className="primary link-button">Produzir minha primeira evidência</Link>
          </div>
        ) : (
          <>
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

            {labStates.length > 0 ? (
              <section className="practice-queue" aria-label="Habilidades observadas nos laboratórios e ateliers">
                <div>
                  <p className="eyebrow">Evidence dos Labs & Ateliers</p>
                  <h2>Percepção, estrutura, volume e criação</h2>
                  <p>Observation, Construction, Form e os Ateliers jogáveis alimentam o mesmo perfil quando o sistema consegue validar uma tentativa real.</p>
                </div>
                {labStates.map((state) => (
                  <article className="practice-card" key={state.skillKey}>
                    <div className="practice-card-top">
                      <span className="practice-priority">Evidência real</span>
                      <span>{state.evidenceCount} evidência(s)</span>
                    </div>
                    <h2>{skillLabel[state.skillKey] ?? state.skillKey}</h2>
                    <div className="practice-mastery">
                      <strong>{Math.round(Number(state.masteryScore) * 100)}%</strong>
                      <span>{state.masteryLevel}</span>
                    </div>
                    <p>{state.lastPracticedAt ? `Praticada em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(state.lastPracticedAt)}` : "Evidência registrada"}</p>
                  </article>
                ))}
              </section>
            ) : null}
          </>
        )}

        <div className="flow-actions"><Link href="/" className="secondary link-button">Voltar ao início</Link></div>
      </section>
    </main>
  );
}
