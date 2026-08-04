const checks = [];
const add = (name, ok, detail) => checks.push({ name, ok, detail });
const value = (name) => process.env[name]?.trim() ?? "";
const isProduction = process.env.NODE_ENV === "production";

const required = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "ALPHA_OPS_TOKEN",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY",
  "STORAGE_SECRET_KEY",
  "NEXT_PUBLIC_APP_URL",
];

for (const name of required) add(`env:${name}`, Boolean(value(name)), value(name) ? "present" : "missing");

const authSecret = value("AUTH_SECRET");
const opsToken = value("ALPHA_OPS_TOKEN");
add("secret:auth-length", authSecret.length >= 32, authSecret ? `length=${authSecret.length}` : "missing");
add("secret:ops-length", opsToken.length >= 32, opsToken ? `length=${opsToken.length}` : "missing");
add("secret:separation", Boolean(authSecret && opsToken && authSecret !== opsToken), "AUTH_SECRET and ALPHA_OPS_TOKEN must be different");

const forbiddenFragments = ["example", "changeme", "replace-me", "your-", "localhost", "127.0.0.1"];
for (const [name, secret] of [["AUTH_SECRET", authSecret], ["ALPHA_OPS_TOKEN", opsToken]]) {
  const lowered = secret.toLowerCase();
  add(`secret:${name}:placeholder`, Boolean(secret) && !forbiddenFragments.some((fragment) => lowered.includes(fragment)), "must not contain placeholder/local-development fragments");
}

let databaseUrl = null;
try {
  databaseUrl = new URL(value("DATABASE_URL"));
  add("database:url", databaseUrl.protocol === "postgres:" || databaseUrl.protocol === "postgresql:", `protocol=${databaseUrl.protocol}`);
  add("database:host", Boolean(databaseUrl.hostname) && !["localhost", "127.0.0.1"].includes(databaseUrl.hostname), databaseUrl.hostname ? "remote host configured" : "host missing");
  add("database:credentials", Boolean(databaseUrl.username), "database username must be present");
} catch {
  add("database:url", false, "invalid PostgreSQL URL");
}

let appUrl = null;
try {
  appUrl = new URL(value("NEXT_PUBLIC_APP_URL"));
  add("app:url", !isProduction || appUrl.protocol === "https:", `protocol=${appUrl.protocol}`);
  add("app:host", Boolean(appUrl.hostname) && !["localhost", "127.0.0.1"].includes(appUrl.hostname), appUrl.hostname ? "public host configured" : "host missing");
} catch {
  add("app:url", false, "invalid application URL");
}

const bucket = value("STORAGE_BUCKET");
add("storage:bucket-name", /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket), bucket ? "S3-compatible bucket syntax" : "missing");
add("storage:credentials", Boolean(value("STORAGE_ACCESS_KEY") && value("STORAGE_SECRET_KEY")), "access key and secret key must both be present");

const endpoint = value("STORAGE_ENDPOINT");
if (endpoint) {
  try {
    const storageUrl = new URL(endpoint);
    add("storage:endpoint", !isProduction || storageUrl.protocol === "https:", `protocol=${storageUrl.protocol}`);
    add("storage:endpoint-host", !["localhost", "127.0.0.1"].includes(storageUrl.hostname), "remote storage host required");
  } catch {
    add("storage:endpoint", false, "invalid storage endpoint URL");
  }
} else {
  add("storage:endpoint", true, "provider default endpoint");
}

const failed = checks.filter((check) => !check.ok);
console.log("SimpleWay Drawing · Production Environment Doctor");
for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}: ${check.detail}`);
console.log(`PRODUCTION_ENV_DOCTOR=${failed.length === 0 ? "PASS" : "FAIL"} passed=${checks.length - failed.length}/${checks.length}`);
console.log("Tehkné Solutions");
if (failed.length) process.exit(1);
