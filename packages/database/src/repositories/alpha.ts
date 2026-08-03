import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../client";
import { artworks, learnerSkillStates, outboxEvents } from "../schema/core";
import { cycleProgress } from "../schema/learning";
import { journeyEntries } from "../schema/journey";
import { C4_CYCLE_KEY } from "./learning-progress";

const DOMAIN_SKILLS = [
  { domain: "Motor", skillKey: "skill.drawing.motor.line_control", href: "/gym", recovery: "Line Control Recovery" },
  { domain: "Perception", skillKey: "skill.drawing.perception.proportion", href: "/observation", recovery: "Proportion Recovery" },
  { domain: "Shape", skillKey: "skill.drawing.shape.decomposition", href: "/construction", recovery: "Shape Decomposition Recovery" },
  { domain: "Form", skillKey: "skill.drawing.form.box_orientation", href: "/form", recovery: "Form Orientation Recovery" },
] as const;

export type AlphaGateStatus = "NOT_READY" | "SUPPORT_REQUIRED" | "READY_WITH_REVIEW" | "READY";
export interface AlphaDomainState { domain: string; skillKey: string; masteryScore: number | null; masteryLevel: string | null; evidenceCount: number; href: string; recovery: string }
export interface AlphaGateSnapshot { status: AlphaGateStatus; c4Completed: boolean; hasCapstone: boolean; hasDrawingZeroRevisit: boolean; domains: AlphaDomainState[]; weakest: AlphaDomainState | null; nextAction: { title: string; description: string; href: string } }

export class DrizzleAlphaRepository {
  constructor(private readonly db: Database) {}

  async getSnapshot(userId: string): Promise<AlphaGateSnapshot> {
    const [c4] = await this.db.select({ status: cycleProgress.status }).from(cycleProgress).where(and(eq(cycleProgress.userId, userId), eq(cycleProgress.cycleKey, C4_CYCLE_KEY))).limit(1);
    const c4Completed = c4?.status === "COMPLETED";
    const states = await this.db.select().from(learnerSkillStates).where(and(eq(learnerSkillStates.userId, userId), inArray(learnerSkillStates.skillKey, DOMAIN_SKILLS.map((item) => item.skillKey))));
    const stateBySkill = new Map(states.map((state) => [state.skillKey, state]));
    const domains: AlphaDomainState[] = DOMAIN_SKILLS.map((item) => {
      const state = stateBySkill.get(item.skillKey);
      return { ...item, masteryScore: state ? Number(state.masteryScore) : null, masteryLevel: state?.masteryLevel ?? null, evidenceCount: state?.evidenceCount ?? 0 };
    });
    const [capstone] = await this.db.select({ id: artworks.id }).from(artworks).where(and(eq(artworks.ownerUserId, userId), eq(artworks.type, "PROJECT"))).limit(1);
    const [revisit] = await this.db.select({ id: artworks.id }).from(artworks).where(and(eq(artworks.ownerUserId, userId), sql`lower(${artworks.title}) = 'drawing zero revisited'`)).limit(1);
    const hasCapstone = Boolean(capstone);
    const hasDrawingZeroRevisit = Boolean(revisit);
    const withEvidence = domains.filter((domain) => domain.evidenceCount > 0 && domain.masteryScore != null);
    const weakest = [...domains].sort((a, b) => (a.masteryScore ?? -1) - (b.masteryScore ?? -1))[0] ?? null;
    const allCovered = withEvidence.length === domains.length;
    const allCompetent = allCovered && domains.every((domain) => (domain.masteryScore ?? 0) >= 0.7);
    const allDeveloping = allCovered && domains.every((domain) => (domain.masteryScore ?? 0) >= 0.5);

    let status: AlphaGateStatus = "NOT_READY";
    if (c4Completed && hasCapstone && hasDrawingZeroRevisit) status = allCompetent ? "READY" : allDeveloping ? "READY_WITH_REVIEW" : "SUPPORT_REQUIRED";

    const nextAction = !c4Completed
      ? { title: "Continue a Foundation", description: "Conclua C0–C4 antes do Alpha Gate.", href: "/learn" }
      : !hasDrawingZeroRevisit
        ? { title: "Refaça seu Drawing Zero", description: "Use a mesma referência do baseline para produzir uma comparação honesta de processo.", href: "/create?mode=revisit" }
        : !hasCapstone
          ? { title: "Faça o Alpha Capstone", description: "Observe, simplifique, construa em volume e invente uma variação própria.", href: "/create?mode=capstone" }
          : status === "SUPPORT_REQUIRED" && weakest
            ? { title: weakest.recovery, description: `Sua evidência mais fraca agora está em ${weakest.domain}. Faça uma recuperação curta e volte ao gate.`, href: weakest.href }
            : status === "READY_WITH_REVIEW" && weakest
              ? { title: `Revisar ${weakest.domain}`, description: "Você pode avançar, mas uma revisão curta aumenta a estabilidade da Foundation.", href: weakest.href }
              : status === "READY"
                ? { title: "Foundation Alpha concluída", description: "Você demonstrou o loop completo: observar, controlar, simplificar, construir e criar.", href: "/journey" }
                : { title: "Produza evidência nos Labs", description: "Complete ao menos uma tentativa em cada domínio antes do gate final.", href: weakest?.href ?? "/gym" };
    return { status, c4Completed, hasCapstone, hasDrawingZeroRevisit, domains, weakest, nextAction };
  }

  async recordGateMilestone(userId: string): Promise<AlphaGateSnapshot> {
    const snapshot = await this.getSnapshot(userId);
    if (snapshot.status !== "READY" && snapshot.status !== "READY_WITH_REVIEW") return snapshot;
    const [existing] = await this.db.select({ id: journeyEntries.id }).from(journeyEntries).where(and(eq(journeyEntries.userId, userId), eq(journeyEntries.type, "ALPHA_GATE"))).limit(1);
    if (!existing) await this.db.transaction(async (tx) => {
      const [entry] = await tx.insert(journeyEntries).values({ userId, type: "ALPHA_GATE", title: snapshot.status === "READY" ? "Foundation Alpha concluída" : "Foundation Alpha concluída com revisão", metadata: { status: snapshot.status, domains: snapshot.domains.map((domain) => ({ domain: domain.domain, masteryScore: domain.masteryScore, evidenceCount: domain.evidenceCount })) } }).returning({ id: journeyEntries.id });
      if (entry) await tx.insert(outboxEvents).values({ eventType: "learning.alpha_gate.completed.v1", aggregateType: "journey_entry", aggregateId: entry.id, payload: { userId, status: snapshot.status } });
    });
    return snapshot;
  }
}
