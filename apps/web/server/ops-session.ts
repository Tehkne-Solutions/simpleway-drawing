import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-swd_ops" : "swd_ops";
const MAX_AGE = 60 * 60 * 4;

function authSecret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET_REQUIRED");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

function createToken(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `ops.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string): boolean {
  const [kind, expiresRaw, signature] = token.split(".");
  if (kind !== "ops" || !expiresRaw || !signature) return false;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  const expected = sign(`${kind}.${expiresRaw}`);
  const actual = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export async function setOpsSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, createToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
    priority: "high",
  });
}

export async function clearOpsSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function hasOpsSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : false;
}
