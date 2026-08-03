import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for database verification");
}

const sql = postgres(databaseUrl, { max: 1 });

const requiredTables = [
  "users",
  "profiles",
  "enrollments",
  "file_assets",
  "artworks",
  "artwork_versions",
  "exercise_attempts",
  "skill_evidence",
  "learner_skill_states",
  "system_outbox_events",
  "alpha_tester_activity",
  "alpha_invites",
  "alpha_invite_redemptions",
] as const;

try {
  const rows = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
  `;

  const present = new Set(rows.map((row) => row.table_name));
  const missing = requiredTables.filter((table) => !present.has(table));

  if (missing.length > 0) throw new Error(`Database schema verification failed. Missing tables: ${missing.join(", ")}`);

  await sql.begin(async (transaction) => {
    const [user] = await transaction<{ id: string }[]>`
      insert into users (email)
      values (${`ci-${crypto.randomUUID()}@simpleway.invalid`})
      returning id
    `;
    if (!user) throw new Error("Failed to create CI verification user");

    await transaction`
      insert into alpha_tester_activity (user_id, last_stage, last_path, heartbeat_count)
      values (${user.id}, 'ONBOARDING', '/onboarding', 1)
    `;

    const [invite] = await transaction<{ id: string }[]>`
      insert into alpha_invites (code_hash, label)
      values (${crypto.randomUUID().replaceAll("-", "").padEnd(64, "0")}, 'CI Invite')
      returning id
    `;
    if (!invite) throw new Error("Failed to create CI verification invite");

    await transaction`
      insert into alpha_invite_redemptions (invite_id, user_id)
      values (${invite.id}, ${user.id})
    `;

    const [artwork] = await transaction<{ id: string }[]>`
      insert into artworks (owner_user_id, type, status, visibility)
      values (${user.id}, 'BASELINE', 'ACTIVE', 'PRIVATE')
      returning id
    `;
    if (!artwork) throw new Error("Failed to create CI verification artwork");

    await transaction`
      insert into system_outbox_events (event_type, aggregate_type, aggregate_id, payload)
      values ('ci.database.verified.v1', 'artwork', ${artwork.id}, ${JSON.stringify({ source: "github-actions" })}::jsonb)
    `;

    throw new Error("ROLLBACK_CI_VERIFICATION");
  }).catch((error: unknown) => {
    if (!(error instanceof Error) || error.message !== "ROLLBACK_CI_VERIFICATION") throw error;
  });

  console.log(`DATABASE_VERIFY=PASS tables=${requiredTables.length} transaction=PASS`);
} finally {
  await sql.end();
}
