import { type INestApplication, StandardSchemaValidationPipe } from "@nestjs/common";
import { ProblemDetailsFilter, validationProblem } from "./common/problem.js";
import { ENV, type Env } from "./config/env.js";
import { REDIS, type RedisClient } from "./infra/redis/redis.module.js";
import { createSessionMiddleware } from "./infra/session/session.middleware.js";

export const GLOBAL_PREFIX = "api/v1";

// Shared by main.ts and e2e tests so both run with identical app configuration.
export function setupApp(app: INestApplication): void {
  const env = app.get<Env>(ENV);
  const redis = app.get<RedisClient>(REDIS);

  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.enableShutdownHooks();
  app.use(createSessionMiddleware(env, redis));
  app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: validationProblem }));
  app.useGlobalFilters(new ProblemDetailsFilter());
}
