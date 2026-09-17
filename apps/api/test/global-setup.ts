import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer } from "@testcontainers/redis";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import type { TestProject } from "vitest/node";

const POSTGRES_IMAGE = "heartlink/postgres:18-postgis3-pgvector0.8.6";
const REDIS_IMAGE = "redis:8.8.2-alpine";

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const [postgres, redis] = await Promise.all([
    new PostgreSqlContainer(POSTGRES_IMAGE).start(),
    new RedisContainer(REDIS_IMAGE).start(),
  ]);

  const databaseUrl = postgres.getConnectionUri();
  const pool = new pg.Pool({ connectionString: databaseUrl });
  await migrate(drizzle({ client: pool }), { migrationsFolder: "./drizzle" });
  await pool.end();

  project.provide("databaseUrl", databaseUrl);
  project.provide("redisUrl", redis.getConnectionUrl());

  return async () => {
    await Promise.all([postgres.stop(), redis.stop()]);
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
    redisUrl: string;
  }
}
