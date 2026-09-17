import type { INestApplication } from "@nestjs/common";
import pg from "pg";
import { createClient } from "redis";
import request from "supertest";
import { inject } from "vitest";
import { createTestApp } from "./support/test-app.js";

type Agent = ReturnType<typeof request.agent>;

const PASSWORD = "correct-horse-1";

describe("auth (e2e)", () => {
  let app: INestApplication;
  let db: pg.Pool;

  beforeAll(async () => {
    app = await createTestApp();
    db = new pg.Pool({ connectionString: inject("databaseUrl") });
  });

  afterAll(async () => {
    await db.end();
    await app.close();
  });

  function newAgent(): Agent {
    return request.agent(app.getHttpServer());
  }

  async function csrf(agent: Agent): Promise<string> {
    const res = await agent.get("/api/v1/auth/csrf").expect(200);
    return res.body.csrfToken as string;
  }

  function sidCookie(res: request.Response): string | undefined {
    const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
    return cookies?.find((cookie) => cookie.startsWith("sid="));
  }

  async function register(agent: Agent, username: string): Promise<request.Response> {
    const token = await csrf(agent);
    return agent
      .post("/api/v1/auth/register")
      .set("x-csrf-token", token)
      .send({ username, password: PASSWORD, passwordConfirm: PASSWORD });
  }

  async function continueLogin(
    agent: Agent,
    username: string,
    password: string,
  ): Promise<request.Response> {
    const token = await csrf(agent);
    return agent
      .post("/api/v1/auth/continue")
      .set("x-csrf-token", token)
      .send({ username, password });
  }

  describe("CSRF protection", () => {
    it("issues an HttpOnly, SameSite=Strict session cookie with the token", async () => {
      const res = await newAgent().get("/api/v1/auth/csrf").expect(200);
      expect(res.body.csrfToken).toEqual(expect.any(String));
      const cookie = sidCookie(res);
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Strict");
    });

    it("rejects unsafe requests without a token", async () => {
      const res = await newAgent()
        .post("/api/v1/auth/continue")
        .send({ username: "nobody", password: PASSWORD });
      expect(res.status).toBe(403);
      expect(res.headers["content-type"]).toContain("application/problem+json");
      expect(res.body).toMatchObject({ status: 403, code: "CSRF_TOKEN_INVALID" });
    });

    it("rejects a wrong token", async () => {
      const agent = newAgent();
      await csrf(agent);
      const res = await agent
        .post("/api/v1/auth/continue")
        .set("x-csrf-token", "forged")
        .send({ username: "nobody", password: PASSWORD });
      expect(res.status).toBe(403);
    });

    it("rejects cross-site requests even with a valid token", async () => {
      const agent = newAgent();
      const token = await csrf(agent);
      const res = await agent
        .post("/api/v1/auth/continue")
        .set("x-csrf-token", token)
        .set("sec-fetch-site", "cross-site")
        .send({ username: "nobody", password: PASSWORD });
      expect(res.status).toBe(403);
    });
  });

  describe("shared login page", () => {
    it("asks unknown users to sign up without creating an account", async () => {
      const res = await continueLogin(newAgent(), "newcomer_01", PASSWORD);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ result: "signup_required" });
      const rows = await db.query("select 1 from users where username = $1", ["newcomer_01"]);
      expect(rows.rowCount).toBe(0);
    });

    it("validates input with RFC 9457 field errors", async () => {
      const agent = newAgent();
      const token = await csrf(agent);
      const res = await agent
        .post("/api/v1/auth/register")
        .set("x-csrf-token", token)
        .send({ username: "ab", password: "short", passwordConfirm: "other" });
      expect(res.status).toBe(400);
      expect(res.headers["content-type"]).toContain("application/problem+json");
      expect(res.body.code).toBe("VALIDATION_FAILED");
      const paths = (res.body.errors as { path: string }[]).map((error) => error.path);
      expect(paths).toEqual(expect.arrayContaining(["username", "password"]));
    });
  });

  describe("register → me → logout → login", () => {
    it("runs the whole flow and rotates the session on login", async () => {
      const agent = newAgent();

      const preToken = await csrf(agent);
      const registered = await agent
        .post("/api/v1/auth/register")
        .set("x-csrf-token", preToken)
        .send({ username: "Flow_User", password: PASSWORD, passwordConfirm: PASSWORD });
      expect(registered.status).toBe(201);
      expect(registered.body).toEqual({
        onboardingStep: "AVATAR_REQUIRED",
        csrfToken: expect.any(String),
      });
      expect(registered.body.csrfToken).not.toBe(preToken);
      const token = registered.body.csrfToken as string;

      const me = await agent.get("/api/v1/me").expect(200);
      expect(me.body).toEqual({
        id: expect.any(String),
        username: "flow_user",
        onboardingStep: "AVATAR_REQUIRED",
        verificationStatus: "pending_ai",
      });
      expect(JSON.stringify(me.body)).not.toContain("argon2");

      await agent.post("/api/v1/auth/logout").set("x-csrf-token", preToken).expect(403);

      await agent.post("/api/v1/auth/logout").set("x-csrf-token", token).expect(204);
      const afterLogout = await agent.get("/api/v1/me");
      expect(afterLogout.status).toBe(401);
      expect(afterLogout.body.code).toBe("UNAUTHENTICATED");

      const preLoginToken = await csrf(agent);
      const preLogin = await agent.get("/api/v1/auth/csrf");
      const loggedIn = await agent
        .post("/api/v1/auth/continue")
        .set("x-csrf-token", preLoginToken)
        .send({ username: "FLOW_USER", password: PASSWORD });
      expect(loggedIn.status).toBe(200);
      expect(loggedIn.body).toMatchObject({
        result: "logged_in",
        onboardingStep: "AVATAR_REQUIRED",
      });
      expect(sidCookie(loggedIn)).toBeDefined();
      expect(sidCookie(loggedIn)).not.toBe(sidCookie(preLogin));
      await agent.get("/api/v1/me").expect(200);
    });

    it("stores an Argon2id hash with at least OWASP's minimum parameters", async () => {
      await register(newAgent(), "hash_check").then((res) => expect(res.status).toBe(201));
      const { rows } = await db.query<{ password_hash: string }>(
        "select password_hash from users where username = $1",
        ["hash_check"],
      );
      const hash = rows[0]?.password_hash ?? "";
      expect(hash).not.toContain(PASSWORD);
      expect(hash.startsWith("$argon2id$")).toBe(true);
      const params = Object.fromEntries(
        (hash.split("$")[3] ?? "").split(",").map((pair) => pair.split("=")),
      ) as Record<string, string>;
      expect(Number(params["m"])).toBeGreaterThanOrEqual(19456);
      expect(Number(params["t"])).toBeGreaterThanOrEqual(2);
      expect(Number(params["p"])).toBeGreaterThanOrEqual(1);
    });
  });

  describe("conflicts and failures", () => {
    it("lets only one of two concurrent registrations win", async () => {
      const results = await Promise.all([
        register(newAgent(), "race_user"),
        register(newAgent(), "race_user"),
      ]);
      const statuses = results.map((res) => res.status).sort();
      expect(statuses).toEqual([201, 409]);
      const conflict = results.find((res) => res.status === 409);
      expect(conflict?.body.code).toBe("USERNAME_TAKEN");
    });

    it("uses one generic message for a wrong password", async () => {
      await register(newAgent(), "wrong_pw_user");
      const res = await continueLogin(newAgent(), "wrong_pw_user", "not-the-password");
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ code: "INVALID_CREDENTIALS", detail: "帳號或密碼錯誤" });
    });

    it("locks the account after 5 failures, even for the right password", async () => {
      await register(newAgent(), "locky");
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const res = await continueLogin(newAgent(), "locky", "wrong-password");
        expect(res.status).toBe(401);
      }
      const locked = await continueLogin(newAgent(), "locky", PASSWORD);
      expect(locked.status).toBe(401);
      expect(locked.body).toMatchObject({ code: "INVALID_CREDENTIALS", detail: "帳號或密碼錯誤" });

      const redis = await createClient({ url: inject("redisUrl") }).connect();
      try {
        expect(await redis.get("heartlink:auth:fail:locky")).toBe("5");
        const ttl = await redis.ttl("heartlink:auth:fail:locky");
        expect(ttl).toBeGreaterThan(0);
        expect(ttl).toBeLessThanOrEqual(900);
        await redis.del("heartlink:auth:fail:locky");
      } finally {
        await redis.close();
      }
      const unlocked = await continueLogin(newAgent(), "locky", PASSWORD);
      expect(unlocked.status).toBe(200);
    });

    it("answers 204 to logout without a login session", async () => {
      const agent = newAgent();
      const token = await csrf(agent);
      await agent.post("/api/v1/auth/logout").set("x-csrf-token", token).expect(204);
    });
  });
});
