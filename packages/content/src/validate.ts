import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import { C0_LESSONS, C1_LESSONS, cycleSchema, lessonSchema, skillSchema } from "./index.js";

const root = resolve(process.cwd(), "../../content/drawing");
const supportedPracticeExercises = new Set([
  "exercise.swd.gym.intentional_line",
  "exercise.swd.gym.curve_path",
  "exercise.swd.gym.ellipse_control",
  "exercise.swd.gym.parallel_rails",
]);

async function readYaml(path: string): Promise<unknown> {
  return parse(await readFile(resolve(root, path), "utf8"));
}

function validateCycleLessons(cycle: ReturnType<typeof cycleSchema.parse>, lessons: typeof C0_LESSONS, label: string, globalKeys: Set<string>) {
  lessonSchema.array().parse(lessons);
  const coveredUnits = new Set<string>();
  for (const lesson of lessons) {
    if (globalKeys.has(lesson.key)) throw new Error(`DUPLICATE_LESSON_KEY:${lesson.key}`);
    globalKeys.add(lesson.key);
    if (!cycle.unitKeys.includes(lesson.unitKey)) throw new Error(`LESSON_UNIT_NOT_IN_CYCLE:${lesson.key}:${lesson.unitKey}`);
    coveredUnits.add(lesson.unitKey);
    for (const block of lesson.blocks) {
      if (block.type === "PRACTICE" && !supportedPracticeExercises.has(block.exerciseKey)) {
        throw new Error(`UNSUPPORTED_PRACTICE_EXERCISE:${block.exerciseKey}`);
      }
    }
  }
  for (const unitKey of cycle.unitKeys) {
    if (!coveredUnits.has(unitKey)) throw new Error(`${label}_UNIT_WITHOUT_LESSON:${unitKey}`);
  }
  return coveredUnits.size;
}

async function main(): Promise<void> {
  const metaSkills = skillSchema.array().parse(await readYaml("skills/meta.yaml"));
  const motorSkills = skillSchema.array().parse(await readYaml("skills/motor.yaml"));
  const c0 = cycleSchema.parse(await readYaml("foundation/c0/cycle.yaml"));
  const c1 = cycleSchema.parse(await readYaml("foundation/c1/cycle.yaml"));

  const skillKeys = new Set<string>();
  for (const skill of [...metaSkills, ...motorSkills]) {
    if (skillKeys.has(skill.key)) throw new Error(`DUPLICATE_SKILL_KEY:${skill.key}`);
    skillKeys.add(skill.key);
  }
  for (const required of [
    "skill.drawing.motor.line_control",
    "skill.drawing.motor.line_straight",
    "skill.drawing.motor.curve_c",
    "skill.drawing.motor.ellipse",
    "skill.drawing.motor.line_parallel",
  ]) {
    if (!skillKeys.has(required)) throw new Error(`REQUIRED_MOTOR_SKILL_MISSING:${required}`);
  }

  const lessonKeys = new Set<string>();
  const c0Units = validateCycleLessons(c0, C0_LESSONS, "C0", lessonKeys);
  const c1Units = validateCycleLessons(c1, C1_LESSONS, "C1", lessonKeys);

  console.info(`Content validation PASS · ${skillKeys.size} skills · ${C0_LESSONS.length + C1_LESSONS.length} lessons · C0 ${c0Units} units · C1 ${c1Units} units`);
}

main().catch((error: unknown) => {
  console.error("Content validation FAILED");
  console.error(error);
  process.exitCode = 1;
});
