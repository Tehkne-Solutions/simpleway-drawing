import { NextRequest, NextResponse } from "next/server";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const legacyReviewIntentParams = ["preserve", "transform"] as const;

export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  if (request.nextUrl.pathname === "/create/work") {
    const hasLegacyReviewIntent = legacyReviewIntentParams.some((param) => request.nextUrl.searchParams.has(param));
    if (hasLegacyReviewIntent) {
      const canonical = request.nextUrl.clone();
      for (const param of legacyReviewIntentParams) canonical.searchParams.delete(param);
      const response = NextResponse.redirect(canonical, 307);
      response.headers.set("x-request-id", requestId);
      return response;
    }
  }

  if (request.nextUrl.pathname.startsWith("/api/") && unsafeMethods.has(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json(
        { code: "CROSS_ORIGIN_REQUEST_BLOCKED", requestId },
        { status: 403, headers: { "x-request-id": requestId } },
      );
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/api/:path*", "/create/work"],
};
