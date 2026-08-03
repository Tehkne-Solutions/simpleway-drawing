import assert from "node:assert/strict";
import test from "node:test";
import { assertSameOrigin, readJsonBody, RequestSecurityError } from "./request-security";

test("assertSameOrigin accepts same-origin mutations", () => {
  const request = new Request("https://app.example.com/api/test", { method: "POST", headers: { origin: "https://app.example.com" } });
  assert.doesNotThrow(() => assertSameOrigin(request));
});

test("assertSameOrigin blocks cross-origin mutations", () => {
  const request = new Request("https://app.example.com/api/test", { method: "POST", headers: { origin: "https://evil.example" } });
  assert.throws(() => assertSameOrigin(request), (error) => error instanceof RequestSecurityError && error.code === "CROSS_ORIGIN_REQUEST_BLOCKED" && error.status === 403);
});

test("readJsonBody parses bounded JSON", async () => {
  const request = new Request("https://app.example.com/api/test", { method: "POST", body: JSON.stringify({ ok: true }), headers: { "content-type": "application/json" } });
  const parsed = await readJsonBody<{ ok: boolean }>(request, 128);
  assert.equal(parsed.ok, true);
});

test("readJsonBody rejects bodies above the limit", async () => {
  const request = new Request("https://app.example.com/api/test", { method: "POST", body: JSON.stringify({ value: "x".repeat(100) }), headers: { "content-type": "application/json" } });
  await assert.rejects(() => readJsonBody(request, 32), (error) => error instanceof RequestSecurityError && error.code === "REQUEST_BODY_TOO_LARGE" && error.status === 413);
});

test("readJsonBody rejects invalid JSON", async () => {
  const request = new Request("https://app.example.com/api/test", { method: "POST", body: "{bad-json", headers: { "content-type": "application/json" } });
  await assert.rejects(() => readJsonBody(request, 128), (error) => error instanceof RequestSecurityError && error.code === "INVALID_JSON" && error.status === 400);
});
