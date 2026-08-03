const required = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY",
  "STORAGE_SECRET_KEY",
  "NEXT_PUBLIC_APP_URL",
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`DEPLOY_ENV_INVALID missing=${missing.join(",")}`);
  process.exit(1);
}

if ((process.env.AUTH_SECRET?.length ?? 0) < 32) {
  console.error("DEPLOY_ENV_INVALID AUTH_SECRET must contain at least 32 characters");
  process.exit(1);
}

let databaseUrl;
let appUrl;
try {
  databaseUrl = new URL(process.env.DATABASE_URL);
  appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
} catch {
  console.error("DEPLOY_ENV_INVALID DATABASE_URL and NEXT_PUBLIC_APP_URL must be valid URLs");
  process.exit(1);
}

if (!databaseUrl.protocol.startsWith("postgres")) {
  console.error("DEPLOY_ENV_INVALID DATABASE_URL must use PostgreSQL");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && appUrl.protocol !== "https:") {
  console.error("DEPLOY_ENV_INVALID NEXT_PUBLIC_APP_URL must use HTTPS in production");
  process.exit(1);
}

if (process.env.STORAGE_ENDPOINT) {
  try {
    new URL(process.env.STORAGE_ENDPOINT);
  } catch {
    console.error("DEPLOY_ENV_INVALID STORAGE_ENDPOINT must be a valid URL when provided");
    process.exit(1);
  }
}

console.log("DEPLOY_ENV=PASS");
