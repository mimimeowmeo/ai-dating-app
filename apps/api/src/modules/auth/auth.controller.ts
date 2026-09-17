import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ProblemException } from "../../common/problem.js";
import { ENV, type Env } from "../../config/env.js";
import type { UserRow } from "../users/index.js";
import {
  type ContinueInput,
  continueSchema,
  type RegisterInput,
  registerSchema,
} from "./auth.schemas.js";
import { AuthService } from "./auth.service.js";
import { endSession, ensureCsrfToken, startAuthenticatedSession } from "./auth-session.js";

type OnboardingStep = UserRow["onboardingStep"];

export type ContinueResponse =
  | { result: "logged_in"; onboardingStep: OnboardingStep; csrfToken: string }
  | { result: "signup_required" };

export interface RegisterResponse {
  onboardingStep: OnboardingStep;
  csrfToken: string;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Get("csrf")
  async csrf(@Req() req: Request): Promise<{ csrfToken: string }> {
    return { csrfToken: await ensureCsrfToken(req) };
  }

  @Post("continue")
  @HttpCode(HttpStatus.OK)
  async continue(
    @Body({ schema: continueSchema }) body: ContinueInput,
    @Req() req: Request,
  ): Promise<ContinueResponse> {
    const outcome = await this.auth.continue(body);
    switch (outcome.kind) {
      case "logged_in": {
        const csrfToken = await startAuthenticatedSession(req, outcome.user.id);
        return { result: "logged_in", onboardingStep: outcome.user.onboardingStep, csrfToken };
      }
      case "signup_required":
        return { result: "signup_required" };
      case "invalid_credentials":
        throw new ProblemException(
          HttpStatus.UNAUTHORIZED,
          "INVALID_CREDENTIALS",
          "帳號或密碼錯誤",
        );
    }
  }

  @Post("register")
  async register(
    @Body({ schema: registerSchema }) body: RegisterInput,
    @Req() req: Request,
  ): Promise<RegisterResponse> {
    const outcome = await this.auth.register(body);
    if (outcome.kind === "username_taken") {
      throw new ProblemException(HttpStatus.CONFLICT, "USERNAME_TAKEN", "這個帳號名稱已經被使用");
    }
    const csrfToken = await startAuthenticatedSession(req, outcome.user.id);
    return { onboardingStep: outcome.user.onboardingStep, csrfToken };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await endSession(req, res, this.env);
  }
}
