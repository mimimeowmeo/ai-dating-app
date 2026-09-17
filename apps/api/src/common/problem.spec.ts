import { HttpStatus, NotFoundException } from "@nestjs/common";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { describeForLog, ProblemException, toProblem, validationProblem } from "./problem.js";

describe("toProblem", () => {
  it("keeps code, detail and errors of a ProblemException", () => {
    const problem = toProblem(
      new ProblemException(HttpStatus.CONFLICT, "USERNAME_TAKEN", "這個帳號名稱已經被使用"),
    );
    expect(problem).toEqual({
      type: "about:blank",
      title: "Conflict",
      status: 409,
      code: "USERNAME_TAKEN",
      detail: "這個帳號名稱已經被使用",
    });
  });

  it("derives a code from Nest's built-in exceptions", () => {
    expect(toProblem(new NotFoundException())).toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("hides unexpected errors behind a generic 500", () => {
    const problem = toProblem(new Error("relation users does not exist"));
    expect(problem).toEqual({
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
      code: "INTERNAL_ERROR",
    });
    expect(JSON.stringify(problem)).not.toContain("relation");
  });
});

describe("describeForLog", () => {
  it("never includes bound query parameters", () => {
    const error = new DrizzleQueryError(
      'insert into "users" ("username", "password_hash") values ($1, $2)',
      ["alice", "$argon2id$v=19$secret-hash"],
      Object.assign(new Error("duplicate key value"), { code: "23505" }),
    );
    const line = describeForLog(error);
    expect(line).toContain("23505");
    expect(line).not.toContain("secret-hash");
    expect(line).not.toContain("alice");
  });
});

describe("validationProblem", () => {
  it("flattens schema issue paths", () => {
    const problem = toProblem(
      validationProblem([
        { message: "Too small", path: ["password"] },
        { message: "Mismatch", path: [{ key: "passwordConfirm" }] },
        { message: "Root" },
      ]),
    );
    expect(problem).toMatchObject({ status: 400, code: "VALIDATION_FAILED" });
    expect(problem.errors).toEqual([
      { path: "password", message: "Too small" },
      { path: "passwordConfirm", message: "Mismatch" },
      { path: "", message: "Root" },
    ]);
  });
});
