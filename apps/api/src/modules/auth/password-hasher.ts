import { Injectable } from "@nestjs/common";
import argon2 from "argon2";

const DUMMY_PASSWORD = "timing-equalizer-not-a-real-password";

@Injectable()
export class PasswordHasher {
  private dummyHash: Promise<string> | undefined;

  hash(password: string): Promise<string> {
    return argon2.hash(password);
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return argon2.verify(passwordHash, password);
  }

  async verifyDummy(password: string): Promise<void> {
    this.dummyHash ??= argon2.hash(DUMMY_PASSWORD);
    await argon2.verify(await this.dummyHash, password);
  }
}
