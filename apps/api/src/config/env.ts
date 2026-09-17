import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),
  SESSION_SECRET: z.string().min(32),
  SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 7),
  COOKIE_SECURE: z.stringbool().default(true),
  AUTH_LOCKOUT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  AUTH_LOCKOUT_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60),
});

export type Env = z.infer<typeof envSchema>;

export const ENV = Symbol("ENV");

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
