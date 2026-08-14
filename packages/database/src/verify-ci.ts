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
  "journey_entries",
  "system_outbox_events",
  "alpha_tester_activity",
  "alpha_invites",
  "alpha_invite_redemptions",
  "swd_schema_migrations",
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

  const [migration] = await sql<{ name: string; checksum: string }[]>`
    select name, checksum
    from swd_schema_migrations
    where name = '0000_foundation_alpha.sql'
  `;
  if (!migration || migration.checksum.length !== 64) {
    throw new Error("Versioned migration registry verification failed");
  }

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

    const [attempt] = await transaction<{ id: string }[]>`
      insert into exercise_attempts (
        user_id, exercise_key, exercise_version, status, assistance_level, difficulty_snapshot, submitted_at
      ) values (
        ${user.id}, 'exercise.swd.pixel.synthesis', 1, 'SUBMITTED', 0,
        ${JSON.stringify({ expedition: "expedition.swd.pixel.synthesis.v1", missionId: "pixel", painted: 64 })}::jsonb,
        now()
      ) returning id
    `;
    if (!attempt) throw new Error("Failed to create CI creative exercise attempt");

    const [evidence] = await transaction<{ id: string }[]>`
      insert into skill_evidence (
        user_id, skill_key, evidence_type, dimension, value, confidence, assistance_level,
        difficulty, context, source_type, source_id, evaluator_type, evaluator_version
      ) values (
        ${user.id}, 'skill.drawing.creative.pixel_synthesis', 'CREATIVE_PROCESS', 'pixel_synthesis',
        1.0000, 0.8600, 0, ${JSON.stringify({ expedition: 1, processValidation: 1 })}::jsonb,
        'PIXEL_EXPEDITION', 'exercise_attempt', ${attempt.id}, 'SYSTEM_MEASURED',
        'exercise.swd.pixel.synthesis-v1'
      ) returning id
    `;
    if (!evidence) throw new Error("Failed to create CI creative skill evidence");

    await transaction`
      insert into learner_skill_states (
        user_id, skill_key, mastery_score, mastery_level, confidence, depth, breadth,
        evidence_count, last_practiced_at, next_review_at, mastery_algorithm_version, updated_at
      ) values (
        ${user.id}, 'skill.drawing.creative.pixel_synthesis', 0.8600, 'DEVELOPING', 0.8600,
        0.8600, 0.2500, 1, now(), now() + interval '7 days', 'swd-mastery-v1', now()
      )
    `;

    const [journey] = await transaction<{ id: string }[]>`
      insert into journey_entries (user_id, type, title, metadata, occurred_at)
      values (
        ${user.id}, 'STUDIO_MISSION_COMPLETED', 'Olho de Croma · Forma dominada',
        ${JSON.stringify({ expeditionKey: "expedition.swd.pixel.synthesis.v1", missionId: "pixel", reward: "Sigilo da Forma" })}::jsonb,
        now()
      ) returning id
    `;
    if (!journey) throw new Error("Failed to create CI creative journey milestone");

    await transaction`
      insert into system_outbox_events (event_type, aggregate_type, aggregate_id, payload)
      values ('studio.pixel_mission.completed.v1', 'journey_entry', ${journey.id}, ${JSON.stringify({ source: "github-actions", evidenceId: evidence.id })}::jsonb)
    `;

    const [projection] = await transaction<{ attempts: number; evidence: number; mastery: number; journey: number }[]>`
      select
        (select count(*)::int from exercise_attempts where user_id = ${user.id} and exercise_key = 'exercise.swd.pixel.synthesis' and status = 'SUBMITTED') as attempts,
        (select count(*)::int from skill_evidence where user_id = ${user.id} and skill_key = 'skill.drawing.creative.pixel_synthesis' and context = 'PIXEL_EXPEDITION') as evidence,
        (select count(*)::int from learner_skill_states where user_id = ${user.id} and skill_key = 'skill.drawing.creative.pixel_synthesis') as mastery,
        (select count(*)::int from journey_entries where user_id = ${user.id} and type = 'STUDIO_MISSION_COMPLETED') as journey
    `;
    if (!projection || projection.attempts !== 1 || projection.evidence !== 1 || projection.mastery !== 1 || projection.journey !== 1) {
      throw new Error("Creative Evidence projection verification failed");
    }

    await transaction`
      insert into system_outbox_events (event_type, aggregate_type, aggregate_id, payload)
      values ('ci.database.verified.v1', 'artwork', ${artwork.id}, ${JSON.stringify({ source: "github-actions" })}::jsonb)
    `;

    throw new Error("ROLLBACK_CI_VERIFICATION");
  }).catch((error: unknown) => {
    if (!(error instanceof Error) || error.message !== "ROLLBACK_CI_VERIFICATION") throw error;
  });

  console.log(`DATABASE_VERIFY=PASS tables=${requiredTables.length} migration_registry=PASS transaction=PASS creative_evidence=PASS`);
} finally {
  await sql.end();
}
