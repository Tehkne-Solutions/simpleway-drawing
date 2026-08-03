import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import { C0_LESSONS, C1_LESSONS, cycleSchema, lessonSchema, skillSchema, type LessonDefinition } from "./index.js";
import { C2_LESSONS } from "./c2-runtime.js";
import { C3_LESSONS } from "./c3-runtime.js";

const root = resolve(process.cwd(), "../../content/drawing");
const supportedPracticeExercises = new Set([
  "exercise.swd.gym.intentional_line",
  "exercise.swd.gym.curve_path",
  "exercise.swd.gym.ellipse_control",
  "exercise.swd.gym.parallel_rails",
  "exercise.swd.observation.ratio_match",
  "exercise.swd.observation.angle_match",
  "exercise.swd.observation.alignment_hunt",
  "exercise.swd.observation.negative_space",
  "exercise.swd.construction.decomposition",
  "exercise.swd.construction.envelope",
  "exercise.swd.construction.silhouette",
  "exercise.swd.construction.overlap",
]);

async function readYaml(path: string): Promise<unknown> {
  return parse(await readFile(resolve(root, path), "utf8"));
}

function validateCycleLessons(cycle: ReturnType<typeof cycleSchema.parse>, lessons: LessonDefinition[], label: string, globalKeys: Set<string>) {
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
  const skillGroups = await Promise.all([
    readYaml("skills/meta.yaml"),
    readYaml("skills/motor.yaml"),
    readYaml("skills/perception.yaml"),
    readYaml("skills/shape.yaml"),
  ]);
  const skills = skillGroups.flatMap((group) => skillSchema.array().parse(group));
  const cycles = await Promise.all([
    readYaml("foundation/c0/cycle.yaml"),
    readYaml("foundation/c1/cycle.yaml"),
    readYaml("foundation/c2/cycle.yaml"),
    readYaml("foundation/c3/cycle.yaml"),
  ]).then((items) => items.map((item) => cycleSchema.parse(item)));

  const skillKeys = new Set<string>();
  for (const skill of skills) {
    if (skillKeys.has(skill.key)) throw new Error(`DUPLICATE_SKILL_KEY:${skill.key}`);
    skillKeys.add(skill.key);
  }

  for (const required of [
    "skill.drawing.motor.line_control",
    "skill.drawing.perception.proportion",
    "skill.drawing.perception.angle",
    "skill.drawing.shape.decomposition",
    "skill.drawing.shape.envelope",
  ]) {
    if (!skillKeys.has(required)) throw new Error(`REQUIRED_SKILL_MISSING:${required}`);
  }

  const lessonKeys = new Set<string>();
  const lessonsByCycle = [C0_LESSONS, C1_LESSONS, C2_LESSONS, C3_LESSONS];
  const unitCounts = cycles.map((cycle, index) => validateCycleLessons(cycle, lessonsByCycle[index] ?? [], `C${index}`, lessonKeys));
  const lessonCount = lessonsByCycle.reduce((sum, lessons) => sum + lessons.length, 0);

  console.info(`Content validation PASS · ${skillKeys.size} skills · ${lessonCount} lessons · ${unitCounts.map((count, index) => `C${index} ${count} units`).join(" · ")}`);
}

main().catch((error: unknown) => {
  console.error("Content validation FAILED");
  console.error(error);
  process.exitCode = 1;
});
