import { timingSafeEqual } from "node:crypto";

export function isValidOpsToken(supplied: string | null | undefined): boolean {
  const configured = process.env.ALPHA_OPS_TOKEN;
  if (!configured || configured.length < 32 || !supplied) return false;

  const expectedBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function isValidOpsAuthorization(request: Request): boolean {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  return isValidOpsToken(header.slice("Bearer ".length));
}
