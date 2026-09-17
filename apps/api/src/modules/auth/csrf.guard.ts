import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { ProblemException } from "../../common/problem.js";
import { csrfTokenMatches } from "./auth-session.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) {
      return true;
    }
    if (req.get("sec-fetch-site") === "cross-site") {
      throw csrfRejected();
    }
    if (!csrfTokenMatches(req, req.get("x-csrf-token"))) {
      throw csrfRejected();
    }
    return true;
  }
}

function csrfRejected(): ProblemException {
  return new ProblemException(
    HttpStatus.FORBIDDEN,
    "CSRF_TOKEN_INVALID",
    "安全驗證失敗，請重新整理頁面後再試一次",
  );
}
