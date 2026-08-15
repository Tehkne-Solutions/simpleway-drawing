import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import test from "node:test";

const root = process.cwd();
const canonicalReadRoute = "app/api/artworks/[artworkId]/versions/[versionNumber]/image/route.ts";

function productionSources(directory: string): string[] {
  const absolute = resolve(root, directory);
  const result: string[] = [];

  for (const name of readdirSync(absolute)) {
    const path = resolve(absolute, name);
    if (statSync(path).isDirectory()) {
      result.push(...productionSources(relative(root, path)));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(name) || name.endsWith(".test.ts") || name.endsWith(".test.tsx")) continue;
    result.push(relative(root, path).replaceAll("\\", "/"));
  }
  return result;
}

test("web presentation never materializes presigned private read URLs", () => {
  const offenders = productionSources("app")
    .concat(productionSources("server"))
    .filter((path) => readFileSync(resolve(root, path), "utf8").includes("createPrivateReadUrl("));

  assert.deepEqual(offenders, [], `presigned private reads escaped the canonical same-origin boundary: ${offenders.join(", ")}`);
});

test("private file bytes are read only by the canonical exact-version image route", () => {
  const readers = productionSources("app")
    .concat(productionSources("server"))
    .filter((path) => readFileSync(resolve(root, path), "utf8").includes("readPrivateFile("));

  assert.deepEqual(readers, [canonicalReadRoute], `unexpected private file readers: ${readers.join(", ")}`);
});
