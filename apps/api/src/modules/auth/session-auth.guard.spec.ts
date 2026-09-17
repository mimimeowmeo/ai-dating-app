import type { ExecutionContext } from "@nestjs/common";
import { parseEnv } from "../../config/env.js";
import { SessionAuthGuard } from "./session-auth.guard.js";

const env = parseEnv({
  DATABASE_URL: "postgresql://u:p@localhost:5433/db",
  REDIS_URL: "redis://localhost:6380",
  SESSION_SECRET: "x".repeat(32),
});

const DAY_MS = 24 * 60 * 60 * 1000;

function contextWith(session: Record<string, unknown>) {
  const destroy = vi.fn((done: (error?: unknown) => void) => done());
  const clearCookie = vi.fn();
  const req = { session: { ...session, destroy } };
  const res = { clearCookie };
  const context = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ExecutionContext;
  return { context, destroy, clearCookie };
}

describe("SessionAuthGuard", () => {
  const guard = new SessionAuthGuard(env);

  it("rejects requests without a logged-in user", async () => {
    const { context } = contextWith({});
    await expect(guard.canActivate(context)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("allows a session younger than 30 days", async () => {
    const { context, destroy } = contextWith({
      userId: "u1",
      authenticatedAt: Date.now() - 29 * DAY_MS,
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(destroy).not.toHaveBeenCalled();
  });

  it("ends a session older than 30 days and answers 401", async () => {
    const { context, destroy, clearCookie } = contextWith({
      userId: "u1",
      authenticatedAt: Date.now() - 31 * DAY_MS,
    });
    await expect(guard.canActivate(context)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(destroy).toHaveBeenCalledOnce();
    expect(clearCookie).toHaveBeenCalledOnce();
  });

  it("treats a session without a login time as expired", async () => {
    const { context, destroy } = contextWith({ userId: "u1" });
    await expect(guard.canActivate(context)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(destroy).toHaveBeenCalledOnce();
  });
});
