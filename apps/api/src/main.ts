import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { setupApp } from "./setup-app.js";

const DEFAULT_PORT = 4000;

function readPort(raw: string | undefined): number {
  if (raw === undefined || raw === "") {
    return DEFAULT_PORT;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`API_PORT must be an integer between 1 and 65535, got "${raw}"`);
  }
  return port;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  const port = readPort(process.env["API_PORT"]);
  await app.listen(port);
}

await bootstrap();
