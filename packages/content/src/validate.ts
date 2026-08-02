import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import { cycleSchema, skillSchema } from "./index.js";

const root = resolve(process.cwd(), "../../content/drawing");

async function readYaml(path: string): Promise<unknown> {
  return parse(await readFile(resolve(root, path), "utf8"));
}

async function main(): Promise<void> {
  const skills = await readYaml("skills/meta.yaml");
  const cycle = await readYaml("foundation/c0/cycle.yaml");

  skillSchema.array().parse(skills);
  cycleSchema.parse(cycle);

  console.info("Content validation PASS");
}

main().catch((error: unknown) => {
  console.error("Content validation FAILED");
  console.error(error);
  process.exitCode = 1;
});
