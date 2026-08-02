import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";
import { cycleSchema, skillSchema } from "./index.js";

const repositoryRoot = resolve(process.cwd(), "../..");
const contentRoot = resolve(repositoryRoot, "content/drawing");
const outputPath = resolve(repositoryRoot, ".cache/content/drawing-foundation-v1.json");

async function readYaml(path: string): Promise<unknown> {
  return parse(await readFile(resolve(contentRoot, path), "utf8"));
}

async function main(): Promise<void> {
  const skills = skillSchema.array().parse(await readYaml("skills/meta.yaml"));
  const cycle = cycleSchema.parse(await readYaml("foundation/c0/cycle.yaml"));

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify({ version: 1, skills, cycles: [cycle] }, null, 2)}\n`,
    "utf8",
  );

  console.info(`Content compile PASS: ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error("Content compile FAILED");
  console.error(error);
  process.exitCode = 1;
});
