import { Controller, Get, Inject, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { ENV, type Env } from "../../config/env.js";
import { type UserRow, UsersRepository } from "../users/index.js";
import { endSession } from "./auth-session.js";
import { requireUserId, SessionAuthGuard, unauthenticated } from "./session-auth.guard.js";

export interface MeResponse {
  id: string;
  username: string;
  onboardingStep: UserRow["onboardingStep"];
  verificationStatus: "pending_ai";
}

@Controller("me")
@UseGuards(SessionAuthGuard)
export class MeController {
  constructor(
    private readonly users: UsersRepository,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Get()
  async me(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<MeResponse> {
    const user = await this.users.findById(requireUserId(req));
    if (user?.status !== "active") {
      await endSession(req, res, this.env);
      throw unauthenticated();
    }
    return {
      id: user.id,
      username: user.username,
      onboardingStep: user.onboardingStep,
      verificationStatus: "pending_ai",
    };
  }
}
