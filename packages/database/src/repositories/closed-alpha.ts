import { count, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../client";
import { artworks, learnerSkillStates } from "../schema/core";
import { cycleProgress } from "../schema/learning";
import { journeyEntries } from "../schema/journey";
import { DrizzleAlphaRepository } from "./alpha";

const CYCLES = ["cycle.swd.c0", "cycle.swd.c1", "cycle.swd.c2", "cycle.swd.c3", "cycle.swd.c4"] as const;

export interface ClosedAlphaDiagnostics {
  activationStage: "FIRST_DRAWING" | "FOUNDATION" | "ALPHA_GATE" | "ALPHA_READY";
  cycles: { key: string; status: string }[];
  artworkCount: number;
  baselineCount: number;
  skillCount: number;
  evidenceCount: number;
  journeyCount: number;
  alphaStatus: string;
  nextAction: { title: string; description: string; href: string };
}

export class DrizzleClosedAlphaRepository {
  constructor(private readonly db: Database) {}

  async getDiagnostics(userId: string): Promise<ClosedAlphaDiagnostics> {
    const progress = await this.db.select({ cycleKey: cycleProgress.cycleKey, status: cycleProgress.status })
      .from(cycleProgress)
      .where(inArray(cycleProgress.cycleKey, [...CYCLES]));
    const userProgress = progress.filter((row) => row.cycleKey && row.status);
    const progressByCycle = new Map(userProgress.map((row) => [row.cycleKey, row.status]));
    const cycles = CYCLES.map((key) => ({ key, status: progressByCycle.get(key) ?? "NOT_STARTED" }));

    const [[artworkStats], [skillStats], [journeyStats]] = await Promise.all([
      this.db.select({ total: count(), baseline: sql<number>`count(*) filter (where ${artworks.type} = 'BASELINE')` }).from(artworks).where(eq(artworks.ownerUserId, userId)),
      this.db.select({ skills: count(), evidence: sql<number>`coalesce(sum(${learnerSkillStates.evidenceCount}), 0)` }).from(learnerSkillStates).where(eq(learnerSkillStates.userId, userId)),
      this.db.select({ total: count() }).from(journeyEntries).where(eq(journeyEntries.userId, userId)),
    ]);

    const alpha = await new DrizzleAlphaRepository(this.db).getSnapshot(userId);
    const baselineCount = Number(artworkStats?.baseline ?? 0);
    const c4Complete = cycles.at(-1)?.status === "COMPLETED";
    const activationStage: ClosedAlphaDiagnostics["activationStage"] = baselineCount === 0
      ? "FIRST_DRAWING"
      : !c4Complete
        ? "FOUNDATION"
        : alpha.status === "READY" || alpha.status === "READY_WITH_REVIEW"
          ? "ALPHA_READY"
          : "ALPHA_GATE";

    return {
      activationStage,
      cycles,
      artworkCount: Number(artworkStats?.total ?? 0),
      baselineCount,
      skillCount: Number(skillStats?.skills ?? 0),
      evidenceCount: Number(skillStats?.evidence ?? 0),
      journeyCount: Number(journeyStats?.total ?? 0),
      alphaStatus: alpha.status,
      nextAction: alpha.nextAction,
    };
  }
}
