import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(here, "../migrations");
const sql = postgres(databaseUrl, { max: 1 });

function checksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function statements(content: string): string[] {
  return content
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

try {
  await sql.unsafe(`
    create table if not exists swd_schema_migrations (
      name text primary key,
      checksum varchar(64) not null,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort((a, b) => a.localeCompare(b));

  let applied = 0;
  let skipped = 0;

  for (const name of files) {
    const content = await readFile(resolve(migrationsDir, name), "utf8");
    const digest = checksum(content);
    const [existing] = await sql<{ checksum: string }[]>`
      select checksum from swd_schema_migrations where name = ${name}
    `;

    if (existing) {
      if (existing.checksum !== digest) {
        throw new Error(`MIGRATION_CHECKSUM_MISMATCH ${name}`);
      }
      skipped += 1;
      continue;
    }

    await sql.begin(async (tx) => {
      for (const statement of statements(content)) {
        await tx.unsafe(statement);
      }
      await tx`
        insert into swd_schema_migrations (name, checksum)
        values (${name}, ${digest})
      `;
    });
    applied += 1;
  }

  console.log(`VERSIONED_MIGRATIONS=PASS applied=${applied} skipped=${skipped} total=${files.length}`);
} finally {
  await sql.end();
}
