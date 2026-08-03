export class RequestSecurityError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const requestUrl = new URL(request.url);
  if (origin !== requestUrl.origin) throw new RequestSecurityError("CROSS_ORIGIN_REQUEST_BLOCKED", 403);
}

export async function readJsonBody<T>(request: Request, maxBytes = 32_768): Promise<T> {
  const length = request.headers.get("content-length");
  if (length && Number(length) > maxBytes) throw new RequestSecurityError("REQUEST_BODY_TOO_LARGE", 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new RequestSecurityError("REQUEST_BODY_TOO_LARGE", 413);
  if (!raw) throw new RequestSecurityError("REQUEST_BODY_REQUIRED", 400);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new RequestSecurityError("INVALID_JSON", 400);
  }
}

export function securityErrorResponse(error: unknown): { code: string; status: number } | null {
  return error instanceof RequestSecurityError ? { code: error.code, status: error.status } : null;
}
