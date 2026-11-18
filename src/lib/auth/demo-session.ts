import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Sesión firmada (HMAC) para el MODO DEMOSTRACIÓN. En producción se usa Supabase Auth.
export const DEMO_COOKIE = "icon_demo_session";
const MAX_AGE_S = 60 * 60 * 12;

function secret() {
  return process.env.DEMO_SESSION_SECRET || "icon-demo-only-insecure-secret-change-me";
}

export function demoPassword() {
  return process.env.DEMO_PASSWORD || "icon-demo-2026";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createDemoToken(userId: string) {
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + MAX_AGE_S}`;
  return { token: `${payload}.${sign(payload)}`, maxAge: MAX_AGE_S };
}

export function verifyDemoToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expected = sign(`${userId}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return userId;
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
