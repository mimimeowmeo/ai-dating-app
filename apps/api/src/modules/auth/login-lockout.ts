import { Inject, Injectable } from "@nestjs/common";
import { ENV, type Env } from "../../config/env.js";
import { REDIS, type RedisClient } from "../../infra/redis/redis.module.js";

@Injectable()
export class LoginLockout {
  constructor(
    @Inject(REDIS) private readonly redis: RedisClient,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private key(username: string): string {
    return `heartlink:auth:fail:${username}`;
  }

  async isLocked(username: string): Promise<boolean> {
    const value = await this.redis.get(this.key(username));
    return Number(value ?? 0) >= this.env.AUTH_LOCKOUT_MAX_ATTEMPTS;
  }

  async recordFailure(username: string): Promise<void> {
    const key = this.key(username);
    const [count] = await this.redis
      .multi()
      .incr(key)
      .expire(key, this.env.AUTH_LOCKOUT_SECONDS, "NX")
      .exec();
    if (typeof count === "number" && count >= this.env.AUTH_LOCKOUT_MAX_ATTEMPTS) {
      await this.redis.expire(key, this.env.AUTH_LOCKOUT_SECONDS);
    }
  }

  async reset(username: string): Promise<void> {
    await this.redis.del(this.key(username));
  }
}
