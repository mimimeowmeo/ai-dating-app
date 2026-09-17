import type { INestApplication } from "@nestjs/common";

export const GLOBAL_PREFIX = "api/v1";

// Shared by main.ts and e2e tests so both run with identical app configuration.
export function setupApp(app: INestApplication): void {
  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.enableShutdownHooks();
}
