import { parseEnv } from "./env.js";

const minimal = {
  DATABASE_URL: "postgresql://u:p@localhost:5433/db",
  REDIS_URL: "redis://:p@localhost:6380",
  SESSION_SECRET: "x".repeat(32),
};

describe("parseEnv", () => {
  it("applies defaults", () => {
    const env = parseEnv(minimal);
    expect(env.API_PORT).toBe(4000);
    expect(env.COOKIE_SECURE).toBe(true);
    expect(env.AUTH_LOCKOUT_MAX_ATTEMPTS).toBe(5);
    expect(env.AUTH_LOCKOUT_SECONDS).toBe(900);
  });

  it("coerces strings", () => {
    const env = parseEnv({ ...minimal, API_PORT: "4100", COOKIE_SECURE: "false" });
    expect(env.API_PORT).toBe(4100);
    expect(env.COOKIE_SECURE).toBe(false);
  });

  it("rejects a bad port and a short secret, naming each field", () => {
    expect(() => parseEnv({ ...minimal, API_PORT: "abc", SESSION_SECRET: "short" })).toThrow(
      /API_PORT[\s\S]*SESSION_SECRET|SESSION_SECRET[\s\S]*API_PORT/,
    );
  });

  it("rejects a non-postgres database url", () => {
    expect(() => parseEnv({ ...minimal, DATABASE_URL: "http://localhost" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("never echoes secret values in the error", () => {
    expect(() => parseEnv({ ...minimal, SESSION_SECRET: "tiny-secret" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("tiny-secret") }),
    );
  });
});
