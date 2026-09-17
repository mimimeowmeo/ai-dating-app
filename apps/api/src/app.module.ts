import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/index.js";

@Module({
  imports: [HealthModule],
})
export class AppModule {}
