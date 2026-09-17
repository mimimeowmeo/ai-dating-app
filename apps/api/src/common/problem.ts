import { STATUS_CODES } from "node:http";
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { DrizzleQueryError } from "drizzle-orm/errors";
import type { Response } from "express";

export interface FieldError {
  path: string;
  message: string;
}

export interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail?: string;
  code: string;
  errors?: FieldError[];
}

export class ProblemException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: string,
    readonly detail?: string,
    readonly errors?: FieldError[],
  ) {
    super({ code, detail }, status);
  }
}

interface SchemaIssue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined;
}

function formatPath(path: SchemaIssue["path"]): string {
  if (!path) {
    return "";
  }
  return path.map((part) => String(typeof part === "object" ? part.key : part)).join(".");
}

export function validationProblem(issues: readonly SchemaIssue[]): ProblemException {
  return new ProblemException(
    HttpStatus.BAD_REQUEST,
    "VALIDATION_FAILED",
    "輸入資料格式不正確",
    issues.map((issue) => ({ path: formatPath(issue.path), message: issue.message })),
  );
}

function codeFromStatus(status: number): string {
  return (STATUS_CODES[status] ?? "Error").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export function toProblem(exception: unknown): ProblemBody {
  if (exception instanceof ProblemException) {
    const status = exception.getStatus();
    return {
      type: "about:blank",
      title: STATUS_CODES[status] ?? "Error",
      status,
      code: exception.code,
      ...(exception.detail === undefined ? {} : { detail: exception.detail }),
      ...(exception.errors === undefined ? {} : { errors: exception.errors }),
    };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return {
      type: "about:blank",
      title: STATUS_CODES[status] ?? "Error",
      status,
      code: codeFromStatus(status),
    };
  }
  return {
    type: "about:blank",
    title: STATUS_CODES[500] ?? "Internal Server Error",
    status: 500,
    code: "INTERNAL_ERROR",
  };
}

// Drizzle query errors embed bound parameters (e.g. password hashes) in `message`; never log them.
export function describeForLog(exception: unknown): string {
  if (exception instanceof DrizzleQueryError) {
    const cause = exception.cause as { code?: unknown; message?: unknown } | undefined;
    return `DrizzleQueryError: ${exception.query} (cause: ${String(cause?.code)} ${String(cause?.message)})`;
  }
  if (exception instanceof Error) {
    return exception.stack ?? `${exception.name}: ${exception.message}`;
  }
  return `Non-error thrown: ${typeof exception}`;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const problem = toProblem(exception);
    if (problem.status >= 500) {
      this.logger.error(describeForLog(exception));
    }
    response.status(problem.status).type("application/problem+json").json(problem);
  }
}
