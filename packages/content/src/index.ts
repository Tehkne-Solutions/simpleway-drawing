import { z } from "zod";

export const localizedTextSchema = z.record(z.string(), z.string().min(1));

export const skillSchema = z.object({
  key: z.string().regex(/^skill\./),
  version: z.number().int().positive(),
  domain: z.enum(["meta", "motor", "perception", "shape", "form", "spatial"]),
  type: z.enum(["META", "MOTOR", "PERCEPTUAL", "STRUCTURAL", "SPATIAL", "CREATIVE"]),
  retentionMode: z.enum(["STANDARD", "MAINTENANCE", "TRANSFER", "PROJECT_BASED"]),
  foundational: z.boolean(),
  transferable: z.boolean(),
  title: localizedTextSchema,
});

export const cycleSchema = z.object({
  key: z.string().regex(/^cycle\./),
  version: z.number().int().positive(),
  stageKey: z.string().regex(/^stage\./),
  title: localizedTextSchema,
  transformation: localizedTextSchema,
  unitKeys: z.array(z.string().regex(/^unit\./)).min(1),
});

export type SkillDefinition = z.infer<typeof skillSchema>;
export type CycleDefinition = z.infer<typeof cycleSchema>;
