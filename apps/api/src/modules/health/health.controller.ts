import { Controller, Get, HttpStatus, Inject } from "@nestjs/common";
import type pg from "pg";
import { ProblemException } from "../../common/problem.js";
import { PG_POOL } from "../../infra/db/db.module.js";
import { REDIS, type RedisClient } from "../../infra/redis/redis.module.js";

export interface HealthResponse {
  status: "ok";
}

export interface ReadinessResponse {
  status: "ok";
  checks: { database: "ok"; redis: "ok" };
}

@Controller("health")
export class HealthController {
  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    @Inject(REDIS) private readonly redis: RedisClient,
  ) {}

  // Liveness only: never touch external services here (see docs/parts/03-backend-api.md §4).
  @Get()
  check(): HealthResponse {
    return { status: "ok" };
  }

  @Get("ready")
  async ready(): Promise<ReadinessResponse> {
    try {
      await Promise.all([this.pool.query("select 1"), this.redis.ping()]);
    } catch {
      throw new ProblemException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "DEPENDENCY_UNAVAILABLE",
        "服務暫時無法使用",
      );
    }
    return { status: "ok", checks: { database: "ok", redis: "ok" } };
  }
}
