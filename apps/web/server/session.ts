import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const DEV_COOKIE_NAME = "swd_session";
const PROD_COOKIE_NAME = "__Host-swd_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function cookieName(): string {
  return process.env.NODE_ENV === "production" ? PROD_COOKIE_NAME : DEV_COOKIE_NAME;
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET_REQUIRED");
  if (process.env.NODE_ENV === "production" && value.length < 32) throw new Error("AUTH_SECRET_TOO_WEAK");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): string | null {
  const [userId, expiresRaw, signature] = token.split(".");
  if (!userId || !expiresRaw || !signature) return null;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  const expected = sign(`${userId}.${expiresRaw}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

export async function setSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(cookieName(), createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
    priority: "high",
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(cookieName())?.value;
  return token ? verifySessionToken(token) : null;
}

export async function requireSessionUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("UNAUTHENTICATED");
  return userId;
}
