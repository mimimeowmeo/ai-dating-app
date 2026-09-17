import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

const rootEnv = new URL("../../.env", import.meta.url);
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for drizzle-kit");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/*/*.schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
