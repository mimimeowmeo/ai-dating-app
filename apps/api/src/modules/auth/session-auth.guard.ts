import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { ProblemException } from "../../common/problem.js";

export function unauthenticated(): ProblemException {
  return new ProblemException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "請先登入");
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.session.userId) {
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
