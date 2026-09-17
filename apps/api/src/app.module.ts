import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module.js";
import { DbModule } from "./infra/db/db.module.js";
import { RedisModule } from "./infra/redis/redis.module.js";
import { AuthModule } from "./modules/auth/index.js";
import { HealthModule } from "./modules/health/index.js";
import { UsersModule } from "./modules/users/index.js";

@Module({
  imports: [ConfigModule, DbModule, RedisModule, HealthModule, UsersModule, AuthModule],
})
export class AppModule {}
