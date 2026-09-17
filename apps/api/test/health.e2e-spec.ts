import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./support/test-app.js";

describe("GET /api/v1/health (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with status ok", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("does not serve health without the /api/v1 prefix", async () => {
    const res = await request(app.getHttpServer()).get("/health");
    expect(res.status).toBe(404);
  });

  it("answers unknown API routes with an RFC 9457 404", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.body).toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("reports readiness of database and redis", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", checks: { database: "ok", redis: "ok" } });
  });
});
