import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import { C0_LESSONS, cycleSchema, lessonSchema, skillSchema } from "./index.js";

const root = resolve(process.cwd(), "../../content/drawing");

async function readYaml(path: string): Promise<unknown> {
  return parse(await readFile(resolve(root, path), "utf8"));
}

async function main(): Promise<void> {
  const metaSkills = skillSchema.array().parse(await readYaml("skills/meta.yaml"));
  const motorSkills = skillSchema.array().parse(await readYaml("skills/motor.yaml"));
  const cycle = await readYaml("foundation/c0/cycle.yaml");

  const skillKeys = new Set<string>();
  for (const skill of [...metaSkills, ...motorSkills]) {
    if (skillKeys.has(skill.key)) throw new Error(`DUPLICATE_SKILL_KEY:${skill.key}`);
    skillKeys.add(skill.key);
  }
  if (!skillKeys.has("skill.drawing.motor.line_control")) throw new Error("LINE_CONTROL_SKILL_REQUIRED");

  const parsedCycle = cycleSchema.parse(cycle);
  lessonSchema.array().parse(C0_LESSONS);

  const keys = new Set<string>();
  const coveredUnits = new Set<string>();
  for (const lesson of C0_LESSONS) {
    if (keys.has(lesson.key)) throw new Error(`DUPLICATE_LESSON_KEY:${lesson.key}`);
    keys.add(lesson.key);
    if (!parsedCycle.unitKeys.includes(lesson.unitKey)) {
      throw new Error(`LESSON_UNIT_NOT_IN_CYCLE:${lesson.key}:${lesson.unitKey}`);
    }
    coveredUnits.add(lesson.unitKey);
  }

  for (const unitKey of parsedCycle.unitKeys) {
    if (!coveredUnits.has(unitKey)) throw new Error(`C0_UNIT_WITHOUT_LESSON:${unitKey}`);
  }

  console.info(`Content validation PASS · ${skillKeys.size} skills · ${C0_LESSONS.length} C0 lessons · ${coveredUnits.size} units covered`);
}

main().catch((error: unknown) => {
  console.error("Content validation FAILED");
  console.error(error);
  process.exitCode = 1;
});
