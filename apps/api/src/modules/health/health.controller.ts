import { Controller, Get } from "@nestjs/common";

export interface HealthResponse {
  status: "ok";
}

@Controller("health")
export class HealthController {
  // Liveness only: never touch external services here (see docs/parts/03-backend-api.md §4).
  @Get()
  check(): HealthResponse {
    return { status: "ok" };
  }
}
