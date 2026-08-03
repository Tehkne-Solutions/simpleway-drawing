# SimpleWay Drawing — Closed Alpha Deployment Runbook

Assinatura: **Tehkné Solutions**

## Target architecture

- **Web:** Vercel, project root `apps/web`
- **Database:** PostgreSQL through `DATABASE_URL`
- **Artwork storage:** private S3-compatible bucket
- **Runtime:** Node.js 22+

The application stays provider-neutral for PostgreSQL and object storage.

## Vercel project

Create a Vercel project named `simpleway-drawing` from the GitHub repository `Tehkne-Solutions/simpleway-drawing`.

Project settings:

- Framework Preset: Next.js
- Root Directory: `apps/web`
- Node.js: 22
- Production branch: `main`

Because this is a pnpm workspace, keep the full monorepo available to the build so `@swd/content`, `@swd/database`, `@swd/domain`, and `@swd/storage` resolve as workspace dependencies.

## Required production variables

Set these in Vercel Production and Preview as appropriate:

- `DATABASE_URL`
- `AUTH_SECRET` — random value with at least 32 characters
- `NEXT_PUBLIC_APP_URL`
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_ENDPOINT` — only when the S3-compatible provider requires a custom endpoint

Optional for later stages:

- `AI_PROVIDER`
- `AI_API_KEY`
- `OBSERVABILITY_DSN`

Never commit production values.

## Pre-deploy gate

Run with the production environment loaded:

```bash
pnpm deploy:check
pnpm typecheck
pnpm content:validate
pnpm test
pnpm build
```

Expected environment result:

```text
DEPLOY_ENV=PASS
```

## Database deployment

Apply schema migrations before exposing a new application version that depends on them:

```bash
pnpm db:migrate
```

Migration credentials must point to the target PostgreSQL database. Do not run development seeds against production.

## Post-deploy gate

Run against the deployment URL:

```bash
DEPLOY_BASE_URL=https://<deployment> pnpm deploy:smoke
```

The remote smoke validates:

1. `/api/health`;
2. security headers and request IDs;
3. `/api/ready` including database connectivity;
4. Home response;
5. guest-session creation;
6. session cookie issuance;
7. authenticated `/api/diagnostics`;
8. `no-store` on private diagnostics.

Expected result:

```text
REMOTE_SMOKE=PASS
```

## Closed Alpha launch checklist

- [ ] Vercel project linked to the GitHub repository
- [ ] Preview deployment succeeds
- [ ] PostgreSQL production database created
- [ ] Database migrations applied
- [ ] Private S3-compatible bucket created
- [ ] Bucket is not publicly readable
- [ ] Production variables configured
- [ ] `NEXT_PUBLIC_APP_URL` matches the canonical HTTPS URL
- [ ] Production deployment succeeds
- [ ] `/api/health` returns 200
- [ ] `/api/ready` returns 200
- [ ] Remote smoke passes
- [ ] Drawing Zero upload succeeds
- [ ] Journey shows Drawing Zero
- [ ] C0 lesson progression works
- [ ] Gym Evidence updates Mastery
- [ ] Observation, Construction and Form Labs record Evidence
- [ ] Alpha Gate opens after Foundation requirements
- [ ] `/diagnostics` reflects the participant correctly

## Rollback rule

If readiness, upload, session or remote smoke fails after release, roll back the web deployment first. Do not modify participant Evidence or Artwork records manually to compensate for a deployment defect.

## Launch policy

Keep the Closed Alpha private and small until the first complete participant journeys are observed through C0–C4 and Alpha Gate. Expand curriculum only after the core loop produces reliable learning and operational data.
