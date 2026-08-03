type LogValue = string | number | boolean | null | undefined;

function sanitize(fields: Record<string, LogValue>): Record<string, Exclude<LogValue, undefined>> {
  return Object.fromEntries(Object.entries(fields).filter((entry): entry is [string, Exclude<LogValue, undefined>] => entry[1] !== undefined));
}

export function logServerError(event: string, request: Request | null, error: unknown, fields: Record<string, LogValue> = {}): void {
  const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "error",
    event,
    requestId: request?.headers.get("x-request-id") ?? null,
    code,
    ...sanitize(fields),
  }));
}
