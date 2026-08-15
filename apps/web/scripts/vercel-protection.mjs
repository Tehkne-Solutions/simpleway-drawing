export function vercelProtectionHeaders(secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "") {
  const value = secret.trim();
  if (!value) return {};
  return {
    "x-vercel-protection-bypass": value,
    "x-vercel-set-bypass-cookie": "true",
  };
}

export function deploymentProtectionCode(response) {
  const location = response.headers.get("location") ?? "";
  if (response.status >= 300 && response.status < 400) {
    if (/^https:\/\/vercel\.com\/sso-api(?:\?|$)/i.test(location)) return "VERCEL_DEPLOYMENT_PROTECTED_SSO";
    if (/\/_vercel\/auth(?:\?|$)/i.test(location)) return "VERCEL_DEPLOYMENT_PROTECTED_AUTH";
  }
  return null;
}

export function assertDeploymentAccessible(response, label = "deployment") {
  const code = deploymentProtectionCode(response);
  if (!code) return;
  const bypassConfigured = Boolean((process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "").trim());
  throw new Error(`${code}: ${label} was intercepted by Vercel Deployment Protection; automation bypass ${bypassConfigured ? "was configured but not accepted" : "is not configured"}`);
}

export function protectionBypassStatus(secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "") {
  return secret.trim() ? "CONFIGURED" : "NOT_CONFIGURED";
}
