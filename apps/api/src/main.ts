import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { ENV, type Env } from "./config/env.js";
import { setupApp } from "./setup-app.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  await app.listen(app.get<Env>(ENV).API_PORT);
}

await bootstrap();
