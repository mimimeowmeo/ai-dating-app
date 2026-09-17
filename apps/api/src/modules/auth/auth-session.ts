import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import type { Env } from "../../config/env.js";
import { sessionCookieName } from "../../infra/session/session.middleware.js";

function newCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

function promisify(run: (done: (error?: unknown) => void) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    run((error) => (error ? reject(error) : resolve()));
  });
}

export async function ensureCsrfToken(req: Request): Promise<string> {
  const existing = req.session.csrfToken;
  if (existing) {
    return existing;
  }
  const token = newCsrfToken();
  req.session.csrfToken = token;
  await promisify((done) => req.session.save(done));
  return token;
}

export function csrfTokenMatches(req: Request, provided: string | undefined): boolean {
  const expected = req.session.csrfToken;
  if (!expected || !provided) {
    return false;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startAuthenticatedSession(req: Request, userId: string): Promise<string> {
  await promisify((done) => req.session.regenerate(done));
  const token = newCsrfToken();
  req.session.userId = userId;
  req.session.csrfToken = token;
  await promisify((done) => req.session.save(done));
  return token;
}

export async function endSession(req: Request, res: Response, env: Env): Promise<void> {
  await promisify((done) => req.session.destroy(done));
  res.clearCookie(sessionCookieName(env.COOKIE_SECURE), {
    path: "/",
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "strict",
  });
}
