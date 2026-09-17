import { continueSchema, registerSchema, usernameSchema } from "./auth.schemas.js";

describe("usernameSchema", () => {
  it("trims and lowercases", () => {
    expect(usernameSchema.parse("  Alice_01 ")).toBe("alice_01");
  });

  it.each(["ab", "a".repeat(31), "alice-01", "中文帳號", "a b c"])("rejects %s", (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(false);
  });
});

describe("continueSchema", () => {
  it("rejects passwords shorter than 8 characters", () => {
    const result = continueSchema.safeParse({ username: "alice", password: "1234567" });
    expect(result.success).toBe(false);
  });

  it("keeps surrounding spaces in passwords", () => {
    const result = continueSchema.parse({ username: "alice", password: "  spaced  " });
    expect(result.password).toBe("  spaced  ");
  });

  it("accepts up to 128 characters and rejects 129", () => {
    expect(continueSchema.safeParse({ username: "alice", password: "x".repeat(128) }).success).toBe(
      true,
    );
    expect(continueSchema.safeParse({ username: "alice", password: "x".repeat(129) }).success).toBe(
      false,
    );
  });
});

describe("registerSchema", () => {
  it("reports a mismatch on passwordConfirm", () => {
    const result = registerSchema.safeParse({
      username: "alice",
      password: "password-1",
      passwordConfirm: "password-2",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["passwordConfirm"]);
  });
});
