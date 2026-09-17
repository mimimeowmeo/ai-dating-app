import { Global, Inject, Logger, Module, type OnApplicationShutdown } from "@nestjs/common";
import { createClient } from "redis";
import { ENV, type Env } from "../../config/env.js";

export const REDIS = Symbol("REDIS");

function createRedisClient(url: string) {
  return createClient({ url });
}
export type RedisClient = ReturnType<typeof createRedisClient>;

const logger = new Logger("Redis");

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ENV],
      useFactory: async (env: Env): Promise<RedisClient> => {
        const client = createRedisClient(env.REDIS_URL);
        client.on("error", (error: unknown) => {
          // Log only the error kind: the connection string (with password) must never reach logs.
          logger.error(`Redis client error: ${error instanceof Error ? error.name : typeof error}`);
        });
        await client.connect();
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly client: RedisClient) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.close();
    }
  }
}
