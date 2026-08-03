import { timingSafeEqual } from "node:crypto";

export function isValidOpsAuthorization(request: Request): boolean {
  const configured = process.env.ALPHA_OPS_TOKEN;
  if (!configured || configured.length < 32) return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const supplied = header.slice("Bearer ".length);

  const expectedBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, suppliedBuffer);
}
