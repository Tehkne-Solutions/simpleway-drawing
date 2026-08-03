import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import { C0_LESSONS, cycleSchema, lessonSchema, skillSchema } from "./index.js";

const root = resolve(process.cwd(), "../../content/drawing");

async function readYaml(path: string): Promise<unknown> {
  return parse(await readFile(resolve(root, path), "utf8"));
}

async function main(): Promise<void> {
  const skills = await readYaml("skills/meta.yaml");
  const cycle = await readYaml("foundation/c0/cycle.yaml");

  skillSchema.array().parse(skills);
  const parsedCycle = cycleSchema.parse(cycle);
  lessonSchema.array().parse(C0_LESSONS);

  const keys = new Set<string>();
  for (const lesson of C0_LESSONS) {
    if (keys.has(lesson.key)) throw new Error(`DUPLICATE_LESSON_KEY:${lesson.key}`);
    keys.add(lesson.key);
    if (!parsedCycle.unitKeys.includes(lesson.unitKey)) {
      throw new Error(`LESSON_UNIT_NOT_IN_CYCLE:${lesson.key}:${lesson.unitKey}`);
    }
  }

  console.info(`Content validation PASS · ${C0_LESSONS.length} C0 lessons`);
}

main().catch((error: unknown) => {
  console.error("Content validation FAILED");
  console.error(error);
  process.exitCode = 1;
});
