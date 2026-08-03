import assert from "node:assert/strict";
import test from "node:test";
import { isValidOpsAuthorization } from "./ops-auth";

const TOKEN = "test-alpha-ops-token-with-at-least-32-characters";

test("accepts the configured operations bearer token", () => {
  const previous = process.env.ALPHA_OPS_TOKEN;
  process.env.ALPHA_OPS_TOKEN = TOKEN;
  try {
    const request = new Request("https://simpleway.test/api/ops/alpha", {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(isValidOpsAuthorization(request), true);
  } finally {
    if (previous === undefined) delete process.env.ALPHA_OPS_TOKEN;
    else process.env.ALPHA_OPS_TOKEN = previous;
  }
});

test("rejects missing, malformed and incorrect operations credentials", () => {
  const previous = process.env.ALPHA_OPS_TOKEN;
  process.env.ALPHA_OPS_TOKEN = TOKEN;
  try {
    assert.equal(isValidOpsAuthorization(new Request("https://simpleway.test/api/ops/alpha")), false);
    assert.equal(isValidOpsAuthorization(new Request("https://simpleway.test/api/ops/alpha", { headers: { authorization: TOKEN } })), false);
    assert.equal(isValidOpsAuthorization(new Request("https://simpleway.test/api/ops/alpha", { headers: { authorization: "Bearer wrong" } })), false);
  } finally {
    if (previous === undefined) delete process.env.ALPHA_OPS_TOKEN;
    else process.env.ALPHA_OPS_TOKEN = previous;
  }
});

test("rejects an unsafe configured token", () => {
  const previous = process.env.ALPHA_OPS_TOKEN;
  process.env.ALPHA_OPS_TOKEN = "short";
  try {
    const request = new Request("https://simpleway.test/api/ops/alpha", {
      headers: { authorization: "Bearer short" },
    });
    assert.equal(isValidOpsAuthorization(request), false);
  } finally {
    if (previous === undefined) delete process.env.ALPHA_OPS_TOKEN;
    else process.env.ALPHA_OPS_TOKEN = previous;
  }
});
