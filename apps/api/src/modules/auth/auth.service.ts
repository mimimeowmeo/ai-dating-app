import { Injectable } from "@nestjs/common";
import { type UserRow, UsersRepository } from "../users/index.js";
import type { ContinueInput, RegisterInput } from "./auth.schemas.js";
import { LoginLockout } from "./login-lockout.js";
import { PasswordHasher } from "./password-hasher.js";

export type ContinueOutcome =
  | { kind: "logged_in"; user: UserRow }
  | { kind: "signup_required" }
  | { kind: "invalid_credentials" };

export type RegisterOutcome = { kind: "created"; user: UserRow } | { kind: "username_taken" };

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly lockout: LoginLockout,
  ) {}

  async continue({ username, password }: ContinueInput): Promise<ContinueOutcome> {
    if (await this.lockout.isLocked(username)) {
      await this.hasher.verifyDummy(password);
      return { kind: "invalid_credentials" };
    }

    const user = await this.users.findByUsername(username);

    if (!user) {
      await this.hasher.verifyDummy(password);
      return { kind: "signup_required" };
    }

    if (user.status !== "active") {
      await this.hasher.verifyDummy(password);
      return { kind: "invalid_credentials" };
    }

    if (!(await this.hasher.verify(user.passwordHash, password))) {
      await this.lockout.recordFailure(username);
      return { kind: "invalid_credentials" };
    }

    await this.lockout.reset(username);
    return { kind: "logged_in", user };
  }

  async register({ username, password }: RegisterInput): Promise<RegisterOutcome> {
    const passwordHash = await this.hasher.hash(password);
    const user = await this.users.createIfUsernameFree(username, passwordHash);
    return user ? { kind: "created", user } : { kind: "username_taken" };
  }
}
