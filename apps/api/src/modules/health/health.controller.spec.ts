import { Test } from "@nestjs/testing";
import { PG_POOL } from "../../infra/db/db.module.js";
import { REDIS } from "../../infra/redis/redis.module.js";
import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  let controller: HealthController;
  const pool = { query: vi.fn() };
  const redis = { ping: vi.fn() };

  beforeEach(async () => {
    pool.query.mockReset().mockResolvedValue({ rows: [] });
    redis.ping.mockReset().mockResolvedValue("PONG");
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PG_POOL, useValue: pool },
        { provide: REDIS, useValue: redis },
      ],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it("reports ok", () => {
    expect(controller.check()).toEqual({ status: "ok" });
  });

  it("reports ready when database and redis respond", async () => {
    await expect(controller.ready()).resolves.toEqual({
      status: "ok",
      checks: { database: "ok", redis: "ok" },
    });
  });

  it("answers 503 without leaking details when a dependency is down", async () => {
    pool.query.mockRejectedValue(new Error("connect ECONNREFUSED postgres://secret@db"));
    await expect(controller.ready()).rejects.toMatchObject({
      code: "DEPENDENCY_UNAVAILABLE",
      detail: "服務暫時無法使用",
    });
  });
});
