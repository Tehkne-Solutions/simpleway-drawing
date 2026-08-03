import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const migrationsDir = resolve(packageRoot, "migrations");
const generatedDir = resolve(packageRoot, "drizzle");

function normalize(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

const baselinePath = resolve(migrationsDir, "0000_foundation_alpha.sql");
const generatedFiles = (await readdir(generatedDir)).filter((name) => /^0000_.+\.sql$/.test(name));

if (generatedFiles.length !== 1) {
  throw new Error(`MIGRATION_BASELINE_GENERATED_COUNT expected=1 actual=${generatedFiles.length}`);
}

const [baseline, generated] = await Promise.all([
  readFile(baselinePath, "utf8"),
  readFile(resolve(generatedDir, generatedFiles[0]), "utf8"),
]);

if (normalize(baseline) !== normalize(generated)) {
  throw new Error("MIGRATION_BASELINE_DRIFT schema differs from frozen 0000_foundation_alpha.sql");
}

console.log(`MIGRATION_BASELINE=PASS generated=${generatedFiles[0]}`);
