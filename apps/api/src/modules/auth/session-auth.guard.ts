import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ProblemException } from "../../common/problem.js";
import { ENV, type Env } from "../../config/env.js";
import { endSession, isAuthenticationExpired } from "./auth-session.js";

export function unauthenticated(): ProblemException {
  return new ProblemException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "請先登入");
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    if (!req.session.userId) {
      throw unauthenticated();
    }
    if (isAuthenticationExpired(req, this.env)) {
      await endSession(req, http.getResponse<Response>(), this.env);
      throw unauthenticated();
    }
    return true;
  }
}

export function requireUserId(req: Request): string {
  const userId = req.session.userId;
  if (!userId) {
    throw unauthenticated();
  }
  return userId;
}
