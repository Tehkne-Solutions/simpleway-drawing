const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const SHA_PREFIX_PATTERN = /^[0-9a-f]{7,40}$/i;
const REF_PATTERN = /^[A-Za-z0-9._/-]{1,200}$/;

export function expectedReleaseIdentity(env = process.env) {
  return {
    sha: (env.EXPECTED_RELEASE_SHA ?? "").trim(),
    ref: (env.EXPECTED_RELEASE_REF ?? "").trim(),
  };
}

export function readReleaseIdentity(payload) {
  const sha = typeof payload?.release?.sha === "string" ? payload.release.sha.trim() : "";
  const ref = typeof payload?.release?.ref === "string" ? payload.release.ref.trim() : "";
  return { sha, ref };
}

export function assertReleaseIdentity(payload, expected = expectedReleaseIdentity()) {
  const actual = readReleaseIdentity(payload);
  if (!SHA_PATTERN.test(actual.sha)) {
    throw new Error(`RELEASE_IDENTITY_MISSING: deployment reported invalid SHA ${actual.sha || "<empty>"}`);
  }
  if (!REF_PATTERN.test(actual.ref)) {
    throw new Error(`RELEASE_IDENTITY_MISSING: deployment reported invalid ref ${actual.ref || "<empty>"}`);
  }

  if (expected.sha) {
    if (!SHA_PREFIX_PATTERN.test(expected.sha)) {
      throw new Error("EXPECTED_RELEASE_SHA must contain 7-40 hexadecimal characters");
    }
    if (!actual.sha.toLowerCase().startsWith(expected.sha.toLowerCase())) {
      throw new Error(`RELEASE_SHA_MISMATCH: expected ${expected.sha}, deployment reports ${actual.sha}`);
    }
  }

  if (expected.ref) {
    if (!REF_PATTERN.test(expected.ref)) throw new Error("EXPECTED_RELEASE_REF is invalid");
    if (actual.ref !== expected.ref) {
      throw new Error(`RELEASE_REF_MISMATCH: expected ${expected.ref}, deployment reports ${actual.ref}`);
    }
  }

  return actual;
}

export function releaseExpectationStatus(expected = expectedReleaseIdentity()) {
  return {
    sha: expected.sha || "NOT_SET",
    ref: expected.ref || "NOT_SET",
  };
}
