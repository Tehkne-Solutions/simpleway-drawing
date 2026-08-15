import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
];

const releaseSha = process.env.GITHUB_SHA
  ?? process.env.VERCEL_GIT_COMMIT_SHA
  ?? process.env.SWD_RELEASE_SHA
  ?? "unknown";
const releaseRef = process.env.GITHUB_REF_NAME
  ?? process.env.VERCEL_GIT_COMMIT_REF
  ?? process.env.SWD_RELEASE_REF
  ?? "unknown";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    SWD_RELEASE_SHA: releaseSha,
    SWD_RELEASE_REF: releaseRef,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
