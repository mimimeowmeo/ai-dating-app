import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { inject } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { setupApp } from "../../src/setup-app.js";

export async function createTestApp(): Promise<INestApplication> {
  process.env["NODE_ENV"] = "test";
  process.env["DATABASE_URL"] = inject("databaseUrl");
  process.env["REDIS_URL"] = inject("redisUrl");
  process.env["SESSION_SECRET"] = "e2e-test-secret-that-is-at-least-32-chars";
  process.env["COOKIE_SECURE"] = "false";

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();
  return app;
}
