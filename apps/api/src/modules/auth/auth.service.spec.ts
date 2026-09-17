import type { UserRow, UsersRepository } from "../users/index.js";
import { AuthService } from "./auth.service.js";
import type { LoginLockout } from "./login-lockout.js";
import type { PasswordHasher } from "./password-hasher.js";

const alice: UserRow = {
  id: "00000000-0000-4000-8000-000000000001",
  username: "alice",
  email: null,
  passwordHash: "stored-hash",
  status: "active",
  onboardingStep: "AVATAR_REQUIRED",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function setup(options: { user?: UserRow; passwordOk?: boolean; locked?: boolean } = {}) {
  const users = {
    findByUsername: vi.fn().mockResolvedValue(options.user),
    createIfUsernameFree: vi.fn(),
  };
  const hasher = {
    hash: vi.fn().mockResolvedValue("new-hash"),
    verify: vi.fn().mockResolvedValue(options.passwordOk ?? false),
    verifyDummy: vi.fn().mockResolvedValue(undefined),
  };
  const lockout = {
    isLocked: vi.fn().mockResolvedValue(options.locked ?? false),
    recordFailure: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined),
  };
  const service = new AuthService(
    users as unknown as UsersRepository,
    hasher as unknown as PasswordHasher,
    lockout as unknown as LoginLockout,
  );
  return { service, users, hasher, lockout };
}

const input = { username: "alice", password: "password-1" };

describe("AuthService.continue", () => {
  it("asks to sign up when the user does not exist, without counting a failure", async () => {
    const { service, hasher, lockout } = setup();
    await expect(service.continue(input)).resolves.toEqual({ kind: "signup_required" });
    expect(hasher.verifyDummy).toHaveBeenCalledOnce();
    expect(lockout.recordFailure).not.toHaveBeenCalled();
  });

  it("logs in with the right password and clears failures", async () => {
    const { service, lockout } = setup({ user: alice, passwordOk: true });
    await expect(service.continue(input)).resolves.toEqual({ kind: "logged_in", user: alice });
    expect(lockout.reset).toHaveBeenCalledWith("alice");
  });

  it("records a failure on a wrong password", async () => {
    const { service, lockout } = setup({ user: alice, passwordOk: false });
    await expect(service.continue(input)).resolves.toEqual({ kind: "invalid_credentials" });
    expect(lockout.recordFailure).toHaveBeenCalledWith("alice");
  });

  it("rejects while locked, even with the right password, and never checks the real hash", async () => {
    const { service, hasher } = setup({ user: alice, passwordOk: true, locked: true });
    await expect(service.continue(input)).resolves.toEqual({ kind: "invalid_credentials" });
    expect(hasher.verify).not.toHaveBeenCalled();
    expect(hasher.verifyDummy).toHaveBeenCalledOnce();
  });

  it("treats inactive accounts as invalid credentials", async () => {
    const { service, hasher } = setup({ user: { ...alice, status: "locked" }, passwordOk: true });
    await expect(service.continue(input)).resolves.toEqual({ kind: "invalid_credentials" });
    expect(hasher.verify).not.toHaveBeenCalled();
  });
});

describe("AuthService.register", () => {
  it("stores the hash, never the plain password", async () => {
    const { service, users } = setup();
    users.createIfUsernameFree.mockResolvedValue(alice);
    await expect(service.register({ ...input, passwordConfirm: input.password })).resolves.toEqual({
      kind: "created",
      user: alice,
    });
    expect(users.createIfUsernameFree).toHaveBeenCalledWith("alice", "new-hash");
  });

  it("reports a taken username", async () => {
    const { service, users } = setup();
    users.createIfUsernameFree.mockResolvedValue(null);
    await expect(service.register({ ...input, passwordConfirm: input.password })).resolves.toEqual({
      kind: "username_taken",
    });
  });
});
