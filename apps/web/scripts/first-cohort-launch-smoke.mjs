import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const opsToken = process.env.ALPHA_OPS_TOKEN;
assert.ok(opsToken, "ALPHA_OPS_TOKEN is required");

async function assertHttp(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
}

const unauthenticated = await fetch(`${baseUrl}/api/ops/invites`, { cache: "no-store" });
assert.equal(unauthenticated.status, 401);

const opsSession = await fetch(`${baseUrl}/api/ops/session`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token: opsToken }),
});
await assertHttp(opsSession, 200, "ops session");
const opsCookie = opsSession.headers.get("set-cookie")?.split(";", 1)[0];
assert.ok(opsCookie);

const batchCreate = await fetch(`${baseUrl}/api/ops/invites`, {
  method: "POST",
  headers: { cookie: opsCookie, "content-type": "application/json" },
  body: JSON.stringify({ label: "First Cohort E2E", quantity: 3, expiresInDays: 7 }),
});
await assertHttp(batchCreate, 201, "batch invite create");
const batchPayload = await batchCreate.json();
assert.equal(batchPayload.quantity, 3);
assert.equal(batchPayload.batch.length, 3);

const codes = batchPayload.batch.map((item) => item.code);
assert.equal(new Set(codes).size, 3);
for (const [index, item] of batchPayload.batch.entries()) {
  assert.equal(item.invite.maxUses, 1);
  assert.equal(item.invite.uses, 0);
  assert.equal(item.invite.status, "ACTIVE");
  assert.match(item.invite.label, new RegExp(`First Cohort E2E · ${index + 1}`));
}

const list = await fetch(`${baseUrl}/api/ops/invites`, { headers: { cookie: opsCookie }, cache: "no-store" });
await assertHttp(list, 200, "invite list");
const listed = (await list.json()).invites.filter((invite) => invite.label.startsWith("First Cohort E2E ·"));
assert.equal(listed.length, 3);

const redeemOne = await fetch(`${baseUrl}/api/invites/redeem`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ code: codes[0], consentAccepted: true, consentVersion: "closed-alpha-v1" }),
});
await assertHttp(redeemOne, 201, "first batch invite redeem");
assert.ok(redeemOne.headers.get("set-cookie"));

const reuseOne = await fetch(`${baseUrl}/api/invites/redeem`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ code: codes[0], consentAccepted: true, consentVersion: "closed-alpha-v1" }),
});
assert.equal(reuseOne.status, 400);

const redeemTwo = await fetch(`${baseUrl}/api/invites/redeem`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ code: codes[1], consentAccepted: true, consentVersion: "closed-alpha-v1" }),
});
await assertHttp(redeemTwo, 201, "second batch invite redeem");

const finalList = await fetch(`${baseUrl}/api/ops/invites`, { headers: { cookie: opsCookie }, cache: "no-store" });
await assertHttp(finalList, 200, "final invite list");
const finalBatch = (await finalList.json()).invites.filter((invite) => invite.label.startsWith("First Cohort E2E ·"));
assert.equal(finalBatch.filter((invite) => invite.status === "CONSUMED").length, 2);
assert.equal(finalBatch.filter((invite) => invite.status === "ACTIVE").length, 1);

console.log("FIRST_COHORT_LAUNCH_E2E=PASS ops_guard batch_create unique_codes one_time_identity independent_redemption invite_status_projection");
